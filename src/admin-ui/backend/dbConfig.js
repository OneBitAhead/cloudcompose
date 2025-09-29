const crypto = require('node:crypto');
const Helper = require("./libs/Helper");

const DB_CONFIG = {
    "tables": {


        "settings":{
            "adminTable": true,
            "name": "Settings",
            "nameCol": "key",
            "description": "",
            "idColumns": ["key"],
            "unique": {
                "key": ["key"],                
            },
            "physicalAttributes": "*",
            "columns": {
                "key": { "type": "string", "nullable": false},
                "value": { "type": "string", nullable: false}                
            }
        },
        

        "users": {
            "adminTable": false,
            "name": "Users",
            "nameCol": "email",
            "description": "",
            "idColumns": ["email"],
            "unique": {
                "email": ["email"],
                "username": ["username"]
            },
            "physicalAttributes": "*",
            "columns": {
                "email": { "type": "string", "nullable": false, immutable: true },
                "username": { "type": "string", nullable: false, immutable: true },
                "password": { "type": "string", nullable: false },            
                "role": { "type": "string", "default": "user" },
                "locale": { "type": "string", "default": "en" }
            }
        },

        "app_blueprints": {
            "adminTable": false,
            "name": "App Blueprint",
            "nameCol": "name",
            "description": "",
            "idColumns": ["full_tech_name"],
            "unique": {
                "stack-app": ["full_tech_name"],
                "name": ["name", "version"]
            },
            "physicalAttributes": "*",
            "columns": {
                'tech_name': { type: "string", length: 100 },
                'version': { "type": "string", length: 40 },
                'full_tech_name': { "type": "string", length: 140 },
                'name': { "type": "string", length: 100 },                
                'stack_name': { "type": "string", length: 100 },
                'multi_instance': { "type": "boolean", default: false },
                'color': { "type": "string", length: 40 },
                'background': { "type": "text" },
                'img': { "type": "text" },
                'ressources': { "type": "json" },
                "url": { "type": "string", length: 200 },
                "external_service": { "type": "boolean", default: false},
                //-------------------------------------
                // for firewall settings!
                'fw_types': { type: "json"},           // Array with type for the firewall (e.g. database, database-tool, collabora-user ...etc)
                'allow_from_fw_type': { type: "json"}, // Array with types to be allowed in firewall (e.g. mariadb is allowed from ["db-tool"] like dbgate or metabase)
                // ------ INSTALL ------------------
                'post_install_route': {type: "string"},
                'has_upsert_user_logic': {type: "boolean", default: false},
                // ------- AUTH --------------------
                "start_url": { "type": "string"}, 
                'with_local_passwords': { "type": "boolean", default: false},
                'default_auth_method': { "type": "string", length: 40, nullable: false },   // basic-auth | cookie | built-in | none
                'auth_method_config': { "type": "json" },         // JSON Object (more configuration, e.g. use basic-auth for a specific header type of request for gitea)
                'auth_headers': { "type": "json" },               // JSON Object: key, value with header and string like "USER.username"... 
                'auth_exception_urls': { "type": "json" },        // ARRAY -- these URLs are NOT checked by the proxy...and can be fetched without any login PUBLICLY!!!
                'code_injection_urls': { "type": "json" },        // JSON Object: key: <url>, object: {replace: ... , code: ....}                   
                'roles': { "type": "json" },                      // ARRAY: ["admin","user"] or ["admin"] null
                'pricing': {"type": "json"}                       // ARRAY of objects: [{}]
            }
        },

        // app instance!
        "apps": {
            "adminTable": false,
            "name": "Apps",
            "nameCol": "name",
            "description": "",
            "idColumns": [],
            "physicalAttributes": "*",
            "columns": {
                'app_blueprint': { title: "App Blueprint", type: "fk_hasOne", table: "app_blueprints", nullable: false },
                'app_name': { "type": "string", length: 100 },
                'tech_name': { "type": "string", length: 100 },
                'version': { "type": "string", length: 40 },
                'project': { "type": "string", length: 100 },
                'uuid': { "type": "string", length: 100 },
                "external_service": { "type": "boolean", default: false},
                "port_mappings": {type: "json"},  // json array with mappings: e.g. [{ internalPort: 80, externalPort: 10001, subdomain: "abc" }]
                'config': { "type": "json" },              // json object
                'integrationData': { "type": "json" },     // json object
                'generated_vars': {  "type": "json"},        // json object
                // install
                'install_status': { type: "selection", default: "waiting", options: ["waiting", "running", "success", "error"] },
                'install_steps': { type: "json"}, 
                "start_url": { "type": "string"},                
                 // for firewall settings!
                'fw_types': { type: "json"},           // Array with type for the firewall (e.g. database, database-tool, collabora-user ...etc)
                'allow_from_fw_type': { type: "json"}, // Array with types to be allowed in firewall (e.g. mariadb is allowed from ["db-tool"] like dbgate or metabase)                
            }

        },

        "permissions": {
            "adminTable": false,
            "name": "Permissions",
            "nameCol": "",
            "description": "",
            "idColumns": ["app", "user"],
            "physicalAttributes": "*",
            "columns": {
                'app': { title: "App", type: "fk_hasOne", table: "apps", nullable: false },
                'user': { title: "User", type: "fk_hasOne", table: "users", nullable: false },
                'role': { type: 'string', nullable: true }
            }
        },


        "certificates": {
            "adminTable": true,
            "name": "Certificates",
            "nameCol": "",
            "description": "",
            "idColumns": ["name"],
            "physicalAttributes": "*",
            "columns": {
                'name': { type: "string", nullable: false},
                'certificate': { type: "string", nullable: false },
                'domains': {type: "json", nullable: true},
                'expires': { type: 'datetime', nullable: true }
            }
        },



        "app_passwords": {
            "adminTable": false,
            "name": "App Passwords",
            "nameCol": "",
            "description": "",
            "idColumns": ["app", "user"],
            "physicalAttributes": "*",
            "columns": {
                'app': { title: "App", type: "fk_hasOne", table: "apps", nullable: false },
                'user': { title: "User", type: "fk_hasOne", table: "users", nullable: false },
                'password': { type: 'passwordSafe', nullable: false}
            }
        },

        "queue": {
            "adminTable": false,
            "name": "Queue",
            "nameCol": "",
            "description": "",
            "physicalAttributes": "*",
            "columns": {
                'cmd': { "type": "string" },
                'payload': { "type": "json" },
                'context': { "type": "json" },
                'status': { type: "selection", default: "waiting", options: ["waiting", "running", "success", "error"] },
                'error': { type: "json" },
                'success': { type: 'json' }
            }
        },

        // Firewall
        "firewall_rules": {
            "adminTable": false,
            "name": "Firewall Rules",
            "nameCol": "",
            "description": "",           
            "physicalAttributes": "*",
            "idColumns": ["from", "to"],
            "unique": {
                "uniqueRule": ["from", "to"],
            },
            "columns": {
                'project': {type: "string", nullable: false},
                'from': {type: "string", nullable: false},                
                'to': { type: "string", nullable: false }                                              
            }
        },

        // Settings (e.g. live logging)
        "settings": {
            "adminTable": false,
            "name": "Settings",
            "nameCol": "",
            "description": "",
            "idColumns": ["key"],
            "physicalAttributes": "*",
            "columns": {
                'key': { type: 'string', nullable: true },
                'value': { type: 'json' }
            }
        },

        // Events (events for any app, e.g. "tested" for x free tests of an app)
        "products": {
            "adminTable":  false,
            "name": "Products",
            "nameCol": "",
            "description": "",
            "idColumns": ["identifier"],
            "physicalAttributes": "*",
            "columns": {
                'identifier':           { type: 'string', nullable: false },
                'app_tech_name':        { type: 'string', nullable: false },
                'billing_period':       { type: 'string', nullable: false },
                'number_of_users':      { type: 'float', nullable: false },
                'description':          { type: 'string', nullable: true },
                'price':                { type: 'float', nullable: false },
                'price_per_unit':       { type: 'float', nullable: false },
            }
        },

        

        "orders": {
            "adminTable": false,
            "name": "Orders",
            "nameCol": "",
            "description": "",
            "idColumns": ["app", "creation_date"],
            "physicalAttributes": "*",
            "columns": {
                'product':              { title: "Product", type: "fk_hasOne", table: "products", nullable: false },                
                'app_blueprint':        { title: "App Blueprint", type: "fk_hasOne", table: "app_blueprints", nullable: false },
                'creation_date':        { type: "datetime", nullable: false },
                'cancellation_date':    { type: "datetime", nullable: true }
            }
        },


        // Invoices
        "invoices": {
            "adminTable": false,
            "name": "Invoices",
            "nameCol": "",
            "description": "",
            "idColumns": ["identifier"],
            "physicalAttributes": "*",
            "columns": {
                'identifier':   { type: 'string', nullable: false },
                'date':         { type: "datetime", nullable: false},
                'description':  { type: 'string', nullable: true },
                'order':        { title: "Order", type: "fk_hasOne", table: "orders", nullable: true },
                'paid':         { type: "boolean", default: false},
            }
        },





    }
}

const DB_HOOKS_AND_FUNCTIONS = async function (db) {



    // USERMANAGEMENT --> on insert...
    db.addHook("beforeInsert", "users", async (data, options) => {       
    });


    db.table("app_passwords").ensureLocalAppPassword = async function(appId, userId, customLength){

        var passwords = await db.table("app_passwords").fetch({}, { user: userId, app: appId }, { attributes: ["password", "app.id", "app.project", "user.email"], withDecryptedValues: true, strongEncryption: false, withRelations: true });
        if(passwords.length === 1) return passwords[0].password;
        // Create it 
        var randomPassword = Helper.generateVar({ length: customLength || 12, specialChars: "#+!" });   
        await db.table("app_passwords").upsert({}, { app: appId, user: userId, password: randomPassword }, { strongEncryption: false });
        return randomPassword;
        
    }
                                



    db.table("app_passwords").getLocalAppPassword = async function(req, email, project){

    
        var userRequest = await db.table("users").fetch({}, { email: email}, { attributes: ["id"]});
        if(userRequest.length !== 1) return {error: `No user with email: ${email}`};
        var user = userRequest[0];

        var appRequest = await db.table("apps").fetch({}, { project: project }, { attributes: ["id"]});
        if(appRequest.length !== 1) return {error: `No app with project name: ${project}`};
        var app = appRequest[0];

        var passwords = await db.table("app_passwords").fetch({}, { user: user.id, app: app.id }, { attributes: ["password", "app.id", "app.project", "user.email"], withDecryptedValues: true, strongEncryption: false, withRelations: true });
        if(passwords.length === 1) return passwords[0].password;
        else return false;

    }

    db.table("app_passwords").getLocalAppCredentialsOfAnyAdmin = async function(req, project){

        var appRequest = await db.table("apps").fetch({}, { project: project }, { attributes: ["id"]});
        if(appRequest.length !== 1) return {error: `No app with project name: ${project}`};
        var app = appRequest[0];

        // Get all admins of this app
        var permissions = await db.table("permissions").fetch({}, { app: app.id }, { attributes: ["*"]});
        var adminUserId = null;
        for(var x in permissions){
            if(permissions[x].role === "admin"){
                adminUserId = permissions[x].user;
                break;
            }
        }

        if(adminUserId === null) return {error: "No users with role 'admin'"};

        var userRequest = await db.table("users").fetch({}, { id: adminUserId}, { attributes: ["id", "email", "username"]});
        if(userRequest.length !== 1) return {error: `No user with id: ${adminUserId}`};
        var user = userRequest[0];

        var passwords = await db.table("app_passwords").fetch({}, { user: user.id, app: app.id }, { attributes: ["password", "app.id", "app.project", "user.email"], withDecryptedValues: true, strongEncryption: false, withRelations: true });
        if(passwords.length === 1) {
            return {
                email: user.email,
                username: user.username,
                password: passwords[0].password
            }
        }
        else return false;

    }





    // Check one admin left for the admin-ui
    const checkOneAdminLeft = async (action, id, data) => {

        // if data.role is changed to "user" ... check for all admins in the system (without the current user id!)
        // or before Delete a user
        if (
            (action === "beforeUpdate" && data.role === "user")
            ||
            (action === "beforeDelete")
        ) {
            var admins = await db.knex("users").count("* as count").whereNot("id", id).where("role", "admin");            
            if (admins[0].count === 0) throw new Error("You need one admin at least");
        }
    }

    db.addHook("beforeUpdate", "users", async (id, data, options) => {
        await checkOneAdminLeft("beforeUpdate", id, data);
    });

    db.addHook("beforeDelete", "users", async (ids, options) => {
        for (var x in ids) {
            await checkOneAdminLeft("beforeDelete", ids[x]);
            await checkOneAdminLeftForApps("beforeDelete", "users", ids[x]);
        }      

    });

    const checkOneAdminLeftForApps = async (action, table, id, data) => {

        // if table "users"  ... 
        if (table === "users" && action === "beforeDelete") {
            // get all apps that have "admin" roles...
            // group permissions by "role" and count it 
            // without the given user ids (deleted or changed to "user" or "none")

            // get apps with "admin" roles
            var query = await db.knex("apps")
                .select("apps.id")
                .count("user as admin_count")
                .whereLike("app_blueprints.roles", "%admin%").leftJoin("app_blueprints", "apps.app_blueprint", "app_blueprints.id")
                .leftJoin("permissions", function () {
                    this.on('permissions.app', "=", 'apps.id')
                        .andOn('permissions.role', '=', db.knex.raw('?', ['admin']))
                        .onNotIn("permissions.user", id)
                })
                .groupBy("apps.id", "role");
            var noAdminsLeft = [];
            for (var x in query) {
                if (query[x].admin_count === 0) noAdminsLeft.push(query[x].id);
            }
            if (noAdminsLeft.length > 0) {
                var appQuery = await db.knex("apps").select("app_name", "tech_name", "project").whereIn("id", noAdminsLeft);            
                // Example usage:
                throw new JsonError('NoAdminsLeft', { message: "a", errorCode: 123, apps: appQuery });
            }         

        } else if (
            (table === "permissions" && action === "beforeUpdate" && data.role === "user")
            ||
            (table === "permissions" && action === "beforeDelete")) {

            // a) permission is changed to "user" ... 
            // b) or deleted (none is set)

            //check left over admins in the app
            var query = await db.table("permissions").fetch({}, { id: id });
            var appId = query[0].app;
            var userId = query[0].user;

            // check if the app is using admin role?
            var appsWithAdminRole = await db.knex("apps").select("app_blueprints.id", "apps.id").where("apps.id", appId).whereLike("app_blueprints.roles", "%admin%").leftJoin("app_blueprints", "apps.app_blueprint", "app_blueprints.id");
            if (appsWithAdminRole.length === 0) {
                log.debug("Permissions", `No admin role in use for app: ${appId}`)
                // app is NOT using "admin" role...no check needed
                return;
            }

            // check admin roles left over
            var query = await db.knex("permissions").select("role").count("* as count").groupBy("role").where("role", "admin").where("app", appId).whereNot("user", userId);
            var roles = {};
            for (var x in query) {
                roles[query[x].role] = query[x].count;
            }

            // Throw an error (no changes of the permission)
            if (!roles.admin || roles.admin === 0) throw new JsonError("NoAppAdminLeft",{});


          

        }


    }

    db.addHook("beforeUpdate", "permissions", async (id, data, options) => {
        await checkOneAdminLeftForApps("beforeUpdate", "permissions", id, data);
    });
    db.addHook("beforeDelete", "permissions", async (ids, options) => {
        for (var x in ids) await checkOneAdminLeftForApps("beforeDelete", "permissions", ids[x]);
    });



    // check uniqueness "tech_name","project"
    // be sure to NOT set a unique constraint in the table definition 
    // (NULL values should be allowed and are not allowed by db)
    const checkUniqueApp = async (action, id, data) => {

        if (action === "beforeInsert" && data.project !== undefined) {
            if (data.project === undefined) {
                // project NULL is ok -> not yet fully installed!
                return;
            }
            var result = await db.knex.table("apps").select("*").where("tech_name", data.tech_name).where("project", data.project);
            if (result.length > 0) {
                let error = `Insert uniqueness error in table 'apps': tech_name '${data.tech_name}', project '${data.project}'`;
                throw new Error(error);
            }

        } else if (action === "beforeUpdate") {

            if (data.tech_name === undefined && data.project === undefined) return;

            var existingApp = await db.knex.table("apps").select("tech_name", "project").where("id", id);
            var app = existingApp[0];
            var result = await db.knex.table("apps").select("*").where("tech_name", data.tech_name || app.tech_name).where("project", data.project || app.project).whereNot("id", id);
            if (result.length > 0) {
                let error = `Update uniqueness error in table 'apps' for id ${id}: tech_name, project`;
                throw new Error(error);
            }
        }


    }
    db.addHook("beforeInsert", "apps", async (data, options) => {
        await checkUniqueApp("beforeInsert", null, data);
    });

    db.addHook("beforeUpdate", "apps", async (id, data, options) => {
        await checkUniqueApp("beforeUpdate", id, data);
    });

}


/** EXPORT THE BOTH OBJECTS */
module.exports = {
    DB_CONFIG: DB_CONFIG,
    DB_HOOKS_AND_FUNCTIONS: DB_HOOKS_AND_FUNCTIONS
}
