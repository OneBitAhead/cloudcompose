const WebSocketHandler = require("./websockets/WebSocketHandler");
const Helper = require("./Helper");
const { lowerCase } = require("lodash");


module.exports = class Tenant {

    #dbName;
    #id;
    #baseDomain;
    #config;
    #keycloakConfig;
    #CONTEXT;
    #db;
    #queue;
    #wsh;
    #permissionCache;

    constructor(dbName, CONTEXT) {
        this.#dbName = dbName;
        this.#CONTEXT = CONTEXT;
        this.#permissionCache = {};
    }

    get id() {
        return this.#id;
    }
    get db() {
        return this.#db;
    }
    get queue() {
        return this.#queue;
    }
    get wsh() {
        return this.#wsh;
    }
    get baseDomain() {
        return this.#baseDomain
    }
    get getKeycloakConfig() {
        return this.#keycloakConfig || false;
    }


    async init(options = {}) {

        // web socket handler!
        this.#wsh = new WebSocketHandler(this, { sessionStore: this.#CONTEXT.store });

        // Database
        try {
            this.#db = await require("./data/Database")({dbName: this.#dbName, wsh: this.#wsh, create: true});

            // Read settings
            var settings = await this.#db.table("settings").fetch({});
            for (var x in settings) {
                if (settings[x].key === "baseDomain") this.#baseDomain = settings[x].value;
                else if (settings[x].key === "tenantId") this.#id = settings[x].value;
                else if (settings[x].keycloakConfig) {
                    try {
                        this.#keycloakConfig = JSON.parse(settings[x].value);
                    } catch (e) {
                        log.error("App", e);
                    }
                }
            }
            // Register in the context!
            this.#CONTEXT.tenants[this.#id] = this;


        } catch (e) {
            log.error("App", e);
        }

        this.#initDatabaseListeners();

        // Keycloak add client!
        if (this.#CONTEXT.keycloak) await this.#initKeycloak();
        else if (this.#CONTEXT.localAuth) await this.#initLocal();

        // Queue (init and start)
        this.#queue = new (require("./Queue"))(this, this.#CONTEXT);
        await this.#queue.startQueue();

        // tell the cc-manager that this tenant exists
        this.registerAtManager();

        await this.#CONTEXT.functions.syncProxyMapping(this);

        // Sync with cc-manager (to refresh apps,.)
        if (options.withSync === true) await this.syncWithManager();

    }


    async #initKeycloak() {

        try {
            // add tenant
            await this.#CONTEXT.keycloak.addTenant(this.#id, this.#config.keycloak);
            // sync clients
            await this.#CONTEXT.keycloak.syncClientsWithKeycloak(this);
        } catch (e) {
            log.error("Keycloak", "No keycloak available:", e)
        }

    }


    async #initLocal(){

        await this.#CONTEXT.localAuth.addTenant(this.#id);

    }



    async refreshCertificates() {

        try {
            var certificates = await this.#db.table("certificates").fetch({});
            for (var x in certificates) {
                let name = certificates[x].name;
                let pem = certificates[x].certificate;
                var result = await this.#CONTEXT.cpCon.send({ tenantId: "*", "topic": "haproxy", cmd: "addCert", payload: { name: name, pem: pem } });
                if (result.error) {
                    log.error("Certificates", result.error);
                } else {
                    // valid certificate
                    await this.#db.table("certificates").upsert({}, { name: name, domains: result.domains, expires: result.expires });
                    log.info("Certificates", `Upsert certificate: '${name}'`);
                }
            }
        } catch (e) {
            log.error("Certificates", e);
        }


    }



    async registerAtManager() {
        await this.#CONTEXT.cpCon.send({ topic: "registerTenant", tenantId: this.#id, payload: {
            baseDomain: this.#baseDomain
        }});
    }

    #initDatabaseListeners() {

        // Listens to events from DB
        // for USERS
        this.#db.on(`users:*:*`, (event, payload) => {
            var action = event.split(":")[1];
            try {
                this.#CONTEXT.functions.syncUserToKeyCloak(this, action, payload.id, payload);
            } catch (e) {
                log.error("App", e);
            }
        })

        this.#db.on(`permissions:*:*`, async (event, payload) => {
            var action = event.split(":")[1];
            try {             
                await this.#CONTEXT.functions.syncRoleMapping(this, action, payload.id, payload)
            } catch (e) {
                log.error("App", e);
            }
        })

        this.#db.on(`app_passwords:*:*`, async (event, payload) => {
            //var action = event.split(":")[1];
            try{                
                await this.#CONTEXT.functions.clearLocalAppPasswordCache(this, 1);
            }catch(e){
                log.error("App", e);
            }

        })


    }


    async syncWithManager() {
        // Sync existing apps
        await this.#syncAvailableApps();
        // Sync proxy mapping!
        await this.#CONTEXT.functions.syncProxyMapping(this);
    }


    async #syncAvailableApps() {

        log.info("Socket", "Sync available apps");

        var full_tech_names = [];
        var appList = await this.#CONTEXT.cpCon.send({ tenantId: this.#id, topic: "apps", cmd: "list", payload: { withData: true } });

        var technameIds = {};

        for (var x in appList) {
            // prepare data
            var app = appList[x].config;
            
            try {
                full_tech_names.push(x);
                app.full_tech_name = x;
                var result = await this.#db.table("app_blueprints").upsert({}, app);
                var appId = result[0];
                technameIds[app.full_tech_name] = appId;
            } catch (e) {                
                log.error("App", e, `Sync error in app: '${x}'`);
            }
        }


        // We now can delete all entries NOT in technames
        log.debug("Socket", { full_tech_names }, "Synchronized apps");
        log.info("Socket", `Synchronized apps: ${full_tech_names.length}`);
        var deletions = await this.#db.knex("app_blueprints").whereNotIn("full_tech_name", full_tech_names).del();
        log.debug("Socket", `Removed old apps: ${deletions}`);

        // Check for existing apps (that not match the blueprint id anymore!)
        var apps = await this.#db.table("apps").fetch({}, {}, { attributes: ["tech_name", "version", "app_blueprint.id"], withRelations: true });
        for (var x in apps) {
            let app = apps[x];
            let appIdentifier = app.tech_name + ":" + app.version;

            if (app.app_blueprint && app.app_blueprint.id !== null) continue;

            // blueprint id gone...
            if (technameIds[appIdentifier]) {
                // update blueprint id!
                var update = await this.#db.table("apps").update({}, apps[x].id, { app_blueprint: technameIds[appIdentifier] });
                log.debug("App", `BlueprintId updated for '${appIdentifier}' (${technameIds[appIdentifier]})`);
            } else {
                // not existing anymore???!?!?!?
                log.error("App", `Blueprint for '${appIdentifier}' not existing anymore?!`);
            }
        }
    }


    /**
     * Get client roles for an app
     * 
     * Either from tenant database OR from keycloak (if used)
     */
    async getClientRoles(email, clientId) {

        if (this.getKeycloakConfig === false) {
            // local roles usage
            var userReq = await this.#db.table("users").fetch({}, { email: email });
            var userId = userReq[0].id;
            var appReq = await this.#db.table("apps").fetch({}, { project: clientId });
            var appId = appReq[0].id;

            var rolesReq = await this.#db.table("permissions").fetch({}, { user: userId, app: appId });
            var roles = [];
            for (var x in rolesReq) {
                roles.push(rolesReq[x].role);
            }
            return roles;

        } else {
            // keycloak usage 
            return await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "kc:clients", cmd: "client-roles", payload: { email: email, clientId: clientId } })
        }


    }



    async getUserPermissions(userId, forceSync){

        // check the internal permission cache
        var userPermissions = Helper.getVar(this.#permissionCache, `${userId}.permissions`, false);
        if(userPermissions !== false && forceSync !== true) {
            log.debug("Permissions",`Permissions from cache for '${userId}'`)
            return userPermissions;
        }        
        userPermissions = {};
        // Fetch from db        
        var permissions = await this.#db.table("permissions").fetch({}, { user: userId }, {attributes: ["id","app.project","roles"], withRelations: true})
        // Add permissions of apps
        for (var x in permissions) {          
            let perm = permissions[x];  
            userPermissions[perm.app.project] = (!perm.role) ? 'user': perm.roles;
        }        
        log.debug("Permissions", userPermissions, `Fetch permissions for '${userId}' from db.`)
        // add to cache
        Helper.setVar(this.#permissionCache, `${userId}.permissions`, userPermissions);            

        return userPermissions;

    }


    async refreshUserPermissions(userId){
        
        var timeout = Helper.getVar(this.#permissionCache, `${userId}.timeout`, false);            
        if(timeout) clearTimeout(timeout);            
        
        Helper.setVar(this.#permissionCache, `${userId}.timeout`, setTimeout(async()=>{
            log.debug("Permissions", "Force refresh of permission (cache) for user:", userId);
            var permissions = await this.getUserPermissions(userId, true);
            // tell the logged in user?
            this.#wsh.sendToUserById(userId, "endpoint:refreshPermissions:*", permissions); 
            // clear the timeout from the cache
            Helper.setVar(this.#permissionCache, `${userId}.timeout`, false); 
                      
        },2000));     


    }


    sendInstallStatus(payload){

        // TODO...get the correct job id and send ONLY to admins!
        // this.#wsh.broadcast("queue:app-create:*:update", payload); 

    }


    
}






