const ProcessConnector = require("./libs/connectors/ProcessConnector").ProcessConnector;
const { has } = require("lodash");
const Helper = require("./libs/Helper");



module.exports = class BusinessFunctions {

    #CONTEXT;
    #proxyConnection;


    constructor(CONTEXT) {
        this.#CONTEXT = CONTEXT;

        // Process connector with 
        this.#proxyConnection = new ProcessConnector('fork', process);
        this.#proxyConnection.setDispatcherFunction(async (data) => {
            try {
                return await this.#dispatchMessagesFromProxy(data);
            } catch (e) {
                log.error("Proxy2App", "Dispatch error:", e);
                return { error: e.toString() }
            }
        });

        // add to the context!
        CONTEXT.proxyConnection = this.#proxyConnection;
    }


    async #dispatchMessagesFromProxy(data) {

        if (!data.tenantId) throw new Error("Data need tenantId!");
        let tenant = this.#CONTEXT.tenants[data.tenantId];
        if (!tenant) throw new Error("No such tenant: " + data.tenantId)

        switch (data.topic) {
            case 'users':
                if (data.cmd === "client-roles") {
                    // Function in tenant
                    return await tenant.getClientRoles(data.payload.email, data.payload.clientId);

                } else if (data.cmd === "app_passwords") {
                    var userId = data.payload.userId;
                    var passwords = await tenant.db.table("app_passwords").fetch({}, { user: userId }, { attributes: ["password", "app.id", "app.project", "user.email"], withDecryptedValues: true, strongEncryption: false, withRelations: true });
                    return passwords;
                } else if (data.cmd === "get") {
                    var query = await tenant.db.table("users").fetch({}, { email: data.payload.email });
                    return query[0] || false;
                } else {
                    log.error("Proxy2App", `No command: ${data.cmd}`, data);
                    return { error: "No command: " + data.cmd + " in topic users" };
                }

            default:
                log.error("Proxy2App", "No topic: ", data.topic, data);
                return { error: "No topic: " + data.topic };
        }
    }



    async getPostInstallRoute(tenant, appId) {

        var apps = await tenant.db.table("apps").fetchById({}, appId, { attributes: ["port_mappings", "app_blueprint.post_install_route"], withRelations: true });
        if (apps.length === 0) throw new Error("NoSuchApp")
        let app = apps[0];
        let port_mapping = (app.port_mappings && app.port_mappings.length > 0) ? app.port_mappings[0] : {};
        if (port_mapping.subdomain && app.app_blueprint.post_install_route !== null) {
            return `https://${port_mapping.subdomain}-${tenant.id}.${tenant.baseDomain}${app.app_blueprint.post_install_route}`;
        }
        return false;
    }



    // Business logic
    async combineStats(tenant, statsFromDocker) {

        // process stats (by project uuid)
        var containerStats = statsFromDocker.ps;
        var dockerStats = statsFromDocker.stats;
        var systemStats = statsFromDocker.system;

        try {
            // get apps (projects) --> but not external services (like scinario)
            var apps = await tenant.db.table("apps").fetch();

            var stats = [];
            for (var x in apps) {
                let app = apps[x];

                let data = {
                    id: app.id,                    
                    app_name: app.app_name,
                    app_blueprint: app.app_blueprint,
                    project: app.project,
                    external_service: app.external_service
                }

                // get the first port_mapping entry (for now!)              
                let port_mapping = (app.port_mappings && app.port_mappings.length > 0) ? app.port_mappings[0] : {};
                if (port_mapping.subdomain) {
                    data.externalURL = `https://${port_mapping.subdomain}-${tenant.id}.${tenant.baseDomain}`;                  
                    if(app.start_url !== undefined && app.start_url !== null) data.externalURL = data.externalURL+app.start_url;
                    data.start_url = app.start_url;
                    data.internalURL = `http://127.0.0.1:${port_mapping.internalPort}`;
                }

                // add container 
                data.displayState = 'running';
                // stats returned by app.uuid --> if empty?! remove from db?!             
                data.containers = containerStats[app.uuid] || [];
                // stats (combined)
                for (var y in data.containers) {
                    let stats = data.containers[y];
                    // com,pute display state (for app)
                    if (stats.displayState !== "running" || stats.displayState !== "healthy") data.displayState = stats.displayState;
                    // add stats of container (from docker stats)
                    if (dockerStats[stats.Names]) data.containers[y].stats = dockerStats[stats.Names];
                }

                if (app.external_service !== true) {
                    // CHECK -- no stats but install is DONE?
                    if (!containerStats[app.uuid] && app.install_status === "success") {
                        log.error("App", `NO STATS FOR APP WITH uuid: ${app.uuid} -> remove from db`);
                        data.displayState = "out-of-sync";
                    }
                }
             
                stats.push(data);

            }
            return { system: systemStats, apps: stats };

        } catch (e) {
            log.error("App", e);
            return false;
        }

    }


    async getStats(tenant, options = {}) {

        var containerStats = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:stats" });
        var stats = await this.combineStats(tenant, containerStats);


        if (options.withBlueprintData === true) {
            var ids = [];
            for (var x in stats.apps) {
                let bId = stats.apps[x].app_blueprint;
                if (ids.indexOf(bId) === -1) ids.push(bId);
            }
            var result = await tenant.db.table("app_blueprints").fetch({}, [{ attrib: "id", op: "in", value: ids }]);
            // by id ...
            var blueprints = {};
            for (var x in result) {
                blueprints[result[x].id] = result[x];
            }

            // ... mixin
            for (var x in stats.apps) {
                let bId = stats.apps[x].app_blueprint;
                stats.apps[x].blueprint = blueprints[bId];
                stats.apps[x].postInstallRoute = await this.getPostInstallRoute(tenant, stats.apps[x].id);
            }
        }


        return stats;
    }




    // Send an event to proxy (cache removes the session!)
    async deleteSessionFromCache(sessionId) {
        var eventData = {
            topic: "sessions", cmd: "delete",
            payload: {
                sessionId: sessionId
            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
    }


    // Send an event to proxy (cache removes the session!)
    async clearLocalAppPasswordCache(tenant, userId) {
        var eventData = {
            topic: "permissions", 
            cmd: "clearLocalAppPasswordCache",
            payload: {
                tenantId: tenant.id, 
                userId: userId
            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
    }


    // If an app is deleted/erased, we need to remove the
    // cached permissions
    async deleteAppPermissions(tenant, appId){

        // get email and app name
        var records = await tenant.db.table("apps").fetchById({}, appId);
        if (records.length !== 1) return false;
        var app = records[0];

        var eventData = {
            topic: "sessions", cmd: "deleteAppPermissions",
            payload: {                
                app: app.project
            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
    }

    // Send an event to proxy (cache remove permission from the app cache for a special app!)
    // e.g. the user has no rights any more....or has now
    async deleteAppPermissionsOfUser(tenant, appId, userId) {

        // get email and app name
        var records = await tenant.db.table("apps").fetchById({}, appId);
        if (records.length !== 1) return false;
        var app = records[0];

        var userRecords = await tenant.db.table("users").fetchById({}, userId);
        if (userRecords.length !== 1) return false;
        var user = userRecords[0];

        var eventData = {
            topic: "sessions", cmd: "deleteAppPermissionOfUser",
            payload: {                
                app: app.project,
                email: user.email
            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
    }

    // Send an event to proxy (cache removes the session!)
    async initSessionFromCache(sessionId) {
        var eventData = {
            topic: "sessions", cmd: "init",
            payload: {
                sessionId: sessionId
            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
    }


    // Mapping for app instances --> register in proxy-server!
    // single refresh
    async refreshAppProxyMapping(tenant, cmd, project, app) {

        if (!app) {
            var records = await tenant.db.table("apps").fetch({}, { project: project });
            if (records.length !== 1) return false;
            app = records[0];
        }

        // get auth data from blueprints!
        var recs = await tenant.db.table("app_blueprints").fetch({}, { id: app.app_blueprint });
        if (recs.length !== 1) return false;
        var blueprint = recs[0];

        // Add endpoints for project
        var eventData = {
            topic: "endpoints", cmd: cmd,
            payload: {
                tenantId: tenant.id,
                baseDomain: tenant.baseDomain,
                tech_name: app.tech_name,
                host: app.project,
                external_service: app.external_service,
                // subdomains to port!!
                port_mappings: app.port_mappings,
                // ---- auth (all from blueprint!!) ---- 
                default_auth_method: blueprint.default_auth_method,
                auth_method_config: blueprint.auth_method_config,
                auth_exception_urls: blueprint.auth_exception_urls,
                code_injection_urls: blueprint.code_injection_urls,
                auth_headers: blueprint.auth_headers,
                // post install
                post_install_route: blueprint.post_install_route,
                generated_vars: app.generated_vars

            }
        }
        log.debug("App2Proxy", { eventData });
        this.#proxyConnection.send(eventData);
        tenant.db.wsh.emit(`endpoint:refresh:${app.project}`, eventData);

    }

    // sync ALL endpoint (e.g. at starting)
    async syncProxyMapping(tenant) {

        // add admin-ui endpoint first
        await this.#proxyConnection.send({ topic: "endpoints", cmd: "addTenant", payload: { tenantId: tenant.id, baseDomain: tenant.baseDomain } });

        var { apps } = await this.getStats(tenant);

        var statsByAppId = {};
        for (var x in apps) {
            statsByAppId[apps[x].id] = apps[x].displayState;
        }
        var records = await tenant.db.table("apps").fetch();

        for (var x in records) {
            let app = records[x];
            if (!statsByAppId[app.id]) {
                log.error("App", `No app instance with id: ${app.id}`);
                continue;
            }
            var cmd = "add";
            if (statsByAppId[app.id] === "exited") cmd = "remove";
            await this.refreshAppProxyMapping(tenant, cmd, app.project, app);
        }

        tenant.db.wsh.emit(`endpoint:refresh:_`, {});

    }





    /***
     * Add / remove application (called "client" in keycloak)
     */
    async addKeycloakClient(tenant, project) {

        var records = await tenant.db.table("apps").fetch({}, { project: project });
        if (records.length !== 1) return false;
        var app = records[0];

        // first domain is taken as ROOT!
        var mapping = app.port_mappings[0] || {};
        var subdomains = [mapping.subdomain, app.uuid];

        var result = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "kc:clients", cmd: "add", payload: { clientId: project, subdomains: subdomains } })
        log.debug("Keycloak", { result }, "Add keycloak client");
    }

    async deleteKeycloakClient(tenant, project) {
        var result = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "kc:clients", cmd: "delete", payload: { clientId: project } })
        log.debug("Keycloak", { result }, "Delete keycloak client");
    }

    /***
     * Users in keycloak (by event -> added, updated, deleted)
     * 
     */
    async syncUserToKeyCloak(tenant, action, id, event) {

        var user = {};
        if (action === "delete") {
            user = event.beforeDelete;
        } else {
            // Get the data of the user!
            var result = await tenant.db.table("users").fetch({}, { id: id });
            user = result[0];
        }

        var changes = event.__changed__ || {};

        log.debug("Keycloak", `SyncUserToKeycloak: ${action} ${tenant.id} ${user}`, changes);

        var result = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "kc:users", cmd: "sync", payload: { action: action, user: user, changes: changes } })
        log.debug("Keycloak", { result }, "Sync user to keycloak");

        // upsert user in ALL apps
        var errors = await this.upsertUsers(tenant, action, null, [user]);
        if (errors.length > 0) log.error("Instances", { errors }, "Upsert errors");
        else log.info("Instances", `Upsert users without errors.`);

    }

    async upsertUsers(tenant, action, appId, users) {

        var errors = [];
        var apps = [];

        // which apps...
        if (appId) {
            apps = await tenant.db.table("apps").fetchById({}, appId, { attributes: ["tech_name", "version", "integrationData", "generated_vars", "app_blueprint.with_local_passwords"], withRelations: true });
        } else {
            apps = await tenant.db.table("apps").fetch({}, {}, { attributes: ["tech_name", "version", "integrationData", "generated_vars", "app_blueprint.with_local_passwords"], withRelations: true });
        }

        for (var x in apps) {

            let app = apps[x];
            let full_tech_name = `${app.tech_name}:${app.version}`;
            var userResult = false;

            if (action === "delete") {

                log.debug("App", `Delete users for app ${full_tech_name}`);
                userResult = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, "topic": "apps", cmd: "deleteUsers", payload: { appIdentifier: full_tech_name, integrationData: app.integrationData, generated_vars: app.generated_vars, users: users } });

            } else {

                log.debug("App", `Upsert users for app ${full_tech_name}`);
                var passwordByUser = {};
                // check for needed local passwords!
                if (app.app_blueprint?.with_local_passwords) {                               
                    // generate or get local app passwords
                    for (var x in users) {
                        users[x].local_app_password = await tenant.db.table("app_passwords").ensureLocalAppPassword(app.id, users[x].id);                                               
                    }
                }
                userResult = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, "topic": "apps", cmd: "upsertUsers", payload: { appIdentifier: full_tech_name, integrationData: app.integrationData, generated_vars: app.generated_vars, users: users } });
            }
            if (userResult && userResult.error) errors.push(userResult.error);
        }//end-of-for-each-app
        return errors
    }

    /***
    * Permissions of a user for a role in an app 
    * (role-mapping in user in keycloak or the apps
    * 
    */
    async syncRoleMapping(tenant, action, id, event) {

        var userId = null;
        var appId = null;

        if (event.beforeDelete) {
            userId = event.beforeDelete.user;
            appId = event.beforeDelete.app;
        } else if (event.__changed__) {
            // Get the data of the user!
            var permission = await tenant.db.table("permissions").fetchById({}, id);
            var perm = permission[0];
            userId = perm.user;
            appId = perm.app;

        } else {
            userId = event.data.user;
            appId = event.data.app;
        }

        // Get the data of the user!
        var result = await tenant.db.table("users").fetch({}, { id: userId });
        var user = result[0];

        // if user is "gone" => deleted...than stop here.
        // the user is deleted in keycloak AND each app (via integration) if needed
        // so no need to go on...
        if (!user) {
            log.info("App", `User ${user.email} was deleted...no permission sync needed`)
            return;
        }


        // Get the data of the app
        var result = await tenant.db.table("apps").fetch({}, { id: appId });
        var app = result[0];
        var appWasDeleted = (!app) ? true : false;

        // default role is "user"
        var role = null;
        // fetch permissions...
        if (action !== "delete") {
            var permissionsResult = await tenant.db.table("permissions").fetch({}, { app: appId, user: userId }, { attributes: ["role"] });
            let permission = permissionsResult[0];
            if (permission) role = permission.role || "user";
        }

        // ONLY if APP is still existing!
        // >> If the APP was deleted...the permission in keycloak are delete with the client
        // >> and the app volume is deleted anyways
        // >> The proxy will remove the client (and therefore the user permissions too)
        // >> All clear :)

        if (appWasDeleted !== true) {

            log.info("App", `Permissions: ${action} -> Role from db: ${role}`);

            // KEYCLOAK USAGE.. skip if not used
            if (tenant.getKeycloakConfig !== false){
                var result = await this.#CONTEXT.cpCon.send({
                    tenantId: tenant.id,
                    topic: "kc:permissions", cmd: "sync", payload: {
                        action: action,
                        // sync with keycloak
                        role: role,
                        clientId: app.project,
                        email: user.email
                    }
                })
                if (result && result.error) log.error("Keycloak", { result }, "Error in kc:permissions");
                else log.debug("Keycloak", { result }, "Permissions in keycloak:");
            }
            
            // syncPermissions in app!      
            let full_tech_name = `${app.tech_name}:${app.version}`;
            let integrationData = {};
            try {
                integrationData = app.integrationData;
            } catch (e) {
                log.error("App", e);
            }

            user.appRole = role;
            // sync via integration script       
            var result = await this.#CONTEXT.cpCon.send({
                tenantId: tenant.id,
                topic: "apps", cmd: "updatePermissions", payload: {
                    appIdentifier: full_tech_name,
                    integrationData: integrationData,
                    generated_vars: app.generated_vars,
                    users: [user]
                }
            })
            if (result && result.error) log.error("Instances", { result }, "Error in app:permissions");
            else log.debug("Instances", { result }, "Permissions in app via integration:");

            // since there have been changes for the app "app.project", we need to delete the cached rights in the PROXY!        
            var eventData = {
                topic: "permissions", cmd: action,
                payload: {
                    clientId: app.project,
                    email: user.email,
                    role: role
                }
            }
            log.debug("App2Proxy", { eventData });
            this.#proxyConnection.send(eventData);
        }

    }


    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), ms);
        })
    }



    async #waitForContainerHealth(tenant, project, sendStatus) {

        log.debug("Install", `[${project}] Wait for healthy container`);
        // check for healthy or running of the container
        if (sendStatus) sendStatus("running", "waitForContainerRunning", "start")

        var ready = false;
        var tries = 0;

        //wait for "state" => "running" or even health "healthy"
        while (ready === false && tries < 300) {
            var containerStats = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:project", cmd: "getState", payload: { project: project } });
            log.debug("Install", `[${project}] Wait for healthy container (${tries}):`, containerStats);

            // VALID STATES WHEN DONE            
            if (
                // running and NO health check
                (containerStats.state === "running" && containerStats.health === "none")
                ||
                // running and HEALTH CHECK done
                (containerStats.state === "running" && containerStats.health === "healthy")
            ) {
                ready = true;
                if (sendStatus) sendStatus("running", "waitForContainerRunning", "success")
            }
            else {
                // wait for 1 second and try again...
                tries++;
                await this.sleep(1000);
            }
        }
        if (ready === false) throw new Error("ContainerNotRunningOrHealthyAfter300Tries");

    }


    getInstallSteps(tenant, blueprint) {

        var steps = [];
        steps.push({ id: 'createDocker', status: null });
         // Only if keycloak is active
        if (tenant.getKeycloakConfig !== false) steps.push({ id: 'createKeycloakEntries', status: null });
        // Uses auth (any)
        if (blueprint.default_auth_method !== "none") steps.push({ id: "addAdminPermissions", status: null })
        //& step without status...
        steps.push({ id: "waitForContainerRunning", status: null })
        // Has a postinstall route?
        if (blueprint.post_install_route !== null) steps.push({ id: "frontendPostInstall", status: null, type: "postinstall" });
        // postinstall
        steps.push({ id: "postinstall", status: null,  type: "postinstall"  })
        // Has upsertUserLogic
        if (blueprint.has_upsert_user_logic === true) steps.push({ id: "upsertUsersInApp", status: null,  type: "postinstall" })
      

        return steps;

    }


    async runInstall(tenant, job, payload, context, sendStatus) {


        var id = payload.id;
        var appId = context.appId;
        var uuid = context.uuid;


        try {

            // Set status
            await tenant.db.table("apps").update({}, context.appId, { install_status: "running" });

            // Fetch data of the app_blueprint
            var result = await tenant.db.table("app_blueprints").fetchById({}, id);
            var appData = result[0];
            var local_app_passwords = {};

            if(appData.with_local_passwords){

                var users = await tenant.db.table("users").fetch({},{},{attributes:["id","email","username","role"]});                
                // generate or get local app passwords
                for (var x in users) {
                    var pwd = await tenant.db.table("app_passwords").ensureLocalAppPassword(context.appId, users[x].id); 
                    local_app_passwords[users[x].email] = {
                        email: users[x].email,
                        username: users[x].username,
                        password: pwd,
                        role: users[x].role
                    }
                }                
            }

            sendStatus("running", "createDocker", "start")

            // Ask to create it in docker
            var result = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, "topic": "docker:project", cmd: "create", payload: { full_tech_name: appData.full_tech_name, uuid: uuid, local_app_passwords: local_app_passwords } });
            if (result.error || (!result.project && appData.external_service !== true)) {
                log.error("Instances", result.error);
                throw new Error(result.error);
            }

            // Update docker data!
            var data = {
                project: result.project,
                config: result.json,
                integrationData: result.integrationData,
                generated_vars: result.generated_vars,
                port_mappings: result.port_mappings,
                install_status: "running"
            }

            log.debug("Instances", { data }, "Created data: ");

            await tenant.db.table("apps").update({}, appId, data);

            sendStatus("running", "createDocker", "success")


        } catch (e) {
            log.error("App", e);
            // delete the app immediately!!            
            await tenant.db.table("apps").delete({}, context.appId);
            throw new Error("No installed:" + e.toString())
        }

        try {
            if (tenant.getKeycloakConfig !== false) {
                sendStatus("running", "createKeycloakEntries", "start")
                // add client to keycloak!!!
                await this.#CONTEXT.functions.addKeycloakClient(tenant, result.project);
                sendStatus("running", "createKeycloakEntries", "success")
            }

            // add mapping to proxy-server (or we will not reach it!)
            await this.refreshAppProxyMapping(tenant, "add", result.project);

            log.debug("Install", `[${result.project}] Add initial admin permissions`);
            if (sendStatus) sendStatus("running", "addAdminPermissions", "start")

            // automatic add admin permissions
            var users = await tenant.db.table("users").fetch({}, {}, { attributes: ["username", "email", "role"] });
            for (var x in users) {
                let user = users[x];
                if (user.role === "admin") {
                    var userId = parseInt(user.id, 10);
                    log.debug("Install", `[${result.project}] Set admin permission for '${user.email}'`);
                    if (appData.roles && appData.roles.indexOf("admin") !== -1) {
                        await tenant.db.table("permissions").upsert({}, { user: userId, app: appId, role: "admin" }, {ignoreEvents: true});
                    } else {
                        await tenant.db.table("permissions").upsert({}, { user: userId, app: appId }, {ignoreEvents: true});
                    }
                    // also reset the internal permissions for this user (waits 2 seconds...)
                    tenant.refreshUserPermissions(userId);

                }
            }
            if (sendStatus) sendStatus("running", "addAdminPermissions", "success")

            // If we do have a frontend setup install...
            // tell the frontend to start it...
            // otherwise go on with the backend postinstall!
            var hasFrontendPostinstall = (appData.post_install_route !== null) ? true : false;

            if (hasFrontendPostinstall) {
                await this.#waitForContainerHealth(tenant, result.project, sendStatus)
                await this.sleep(2000);
                // send the event!                    
                var postInstallRoute = await this.getPostInstallRoute(tenant, appId);
                sendStatus("running", "frontendPostInstall", postInstallRoute);
                // set job to sleep!!
                return "follwed_by_frontend_post_install";
            } else {
                // directly to runPostinstall           
                await this.runPostinstall(tenant, appId, sendStatus);
            }

        } catch (e) {
            log.error("App", e);
            // Set status
            await tenant.db.table("apps").update({}, context.appId, { install_status: "error" });
            throw new Error("Not installed correctly:" + e.toString())
        }

    }


    async runPostinstall(tenant, appId, sendStatus) {

        // return { installed: "ok" };    
        // Fetch data of the app
        var result = await tenant.db.table("apps").fetchById({}, appId, { attributes: ["*", "app_blueprint.roles", "app_blueprint.post_install_route"], withRelations: true });

        if (result.length === 0) throw new Error("NoSuchApp:" + appId);
        var app = result[0];

        let full_tech_name = `${app.tech_name}:${app.version}`;
        log.info("Install", `[${full_tech_name}] Start postinstall`)

        if (app.external_service === true) {
            log.info("Install", `[${full_tech_name}] External service: run postinstall directly`);
        }
        else {
            await this.#waitForContainerHealth(tenant, app.project, sendStatus)
        }

        if (sendStatus) sendStatus("running", "postinstall", "start");
        var postInst = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:project", cmd: "postinstall", payload: { appIdentifier: full_tech_name, integrationData: app.integrationData } });
        if (postInst && postInst.error) throw new Error(postInst.error);
        if (sendStatus) sendStatus("running", "postinstall", "success");


        log.debug("Install", `[${full_tech_name}] Upsert users in app`);
        if (sendStatus) sendStatus("running", "upsertUsersInApp", "start");

        var users = await tenant.db.table("users").fetch({}, {}, { attributes: ["username", "email", "role"] });
        // now we can add the users to the app (via upsertUsers call to the cc-manager)              
        var errors = await this.upsertUsers(tenant, "upsert", app.id, users);
        if (errors.length > 0) {
            sendStatus("running", "upsertUsersInApp", "error"); 
            throw new Error(errors);
        }
        if (sendStatus) sendStatus("running", "upsertUsersInApp", "success");


        log.debug("Install", `[${full_tech_name}] Refresh proxy mapping`);
        if (sendStatus) sendStatus("running", "refreshProxyMapping")


        log.info("Install", `[${full_tech_name}] Postinstall is done`);
        await tenant.db.table("apps").update({}, appId, {install_status: "success"});
       

        return { installed: "ok" }


    }

}