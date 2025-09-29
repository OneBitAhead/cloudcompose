import bcrypt from "bcryptjs";


/**
 * 
 */
export default class Integration {

    get config() {

   


        return {
            "name": "Open Project",
            "tech_name": "openproject",
            "version": "latest",
            "url": "https://www.openproject.org",
            "color": "#bb83fb",
            "default_auth_method": "cookie",
            "auth_method_config": {
                // "byHeader": {
                //     // if user-agent has "Docker-Client" or "curl" in the header --> use basic auth
                //     "x-api-usage": { pattern: "true", flags: "i", auth_method: "basic-auth" }
                // }
            },
            // local passwords!
            "with_local_passwords": true,
            "roles": ["admin", "user"],
            // ....
            auth_exception_urls: [
                "/manifest.json"
            ],
            // Web route to run for postinstall (AFTER creating and starting the web container)
            post_install_route: "/account/register",
            // therefore the proxy intercepts the return value from the provided URLs and is replacing (if found)
            // auto login urls contain the URL and the replace string
            code_injection_urls: [
                // Install
                {
                    "type": "install",
                    "patterns": ["/account/register"],
                    "replaceString": `<meta name="viewport" content="width=device-width">`,
                    "code": `<meta name="viewport" content="width=device-width">
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{   
                                            
                            cloudcomposeDebug(true);  
                            
                            // Tell the installing iframe...we are starting
                            installStatus("start");
                            
                            console.log("{{username}},{{email}}, {{password}}")

                            await sleep(2000);
                            
                            // Administrator name
                            await emulateTyping("#user_login", "{{username}}");

                            await emulateTyping("#user_firstname", "Firstname");
                            await emulateTyping("#user_lastname", "Lastname");                           
                            
                            //Administrator Email
                            await emulateTyping('#user_mail', "{{email}}")
                            // Password
                            await emulateTyping('#user_password', "{{password}}")
                            await emulateTyping('#user_password_confirmation', "{{password}}");
                            
                            await sleep(1000);
                            // tell "InstallDone" in 10 seconds from now on                            
                            installDone(10000);  
                            click('button.-primary');    
                            
                            
                      })
                      </script>`
                },
                // Install
                {
                    "type": "login",
                    "patterns": ["/login"],
                    "replaceString": `<meta name="viewport" content="width=device-width">`,
                    "code": `<meta name="viewport" content="width=device-width">
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{   
                                            
                                               
                            console.log("{{username}},{{password}}")

                            await emulateTyping("#username", "{{username}}");
                            await emulateTyping("#password", "{{password}}");                            
                          
                            //click('input[name="login"]');    
                            
                            
                      })
                      </script>`
                }
            ]
        }
    }



    generatedVars(tenant) {
        return {
            "DB_PASS": { length: 20, specialChars: '' }
        }
    }


    // needed containers
    getContainers(tenant, generatedVars, local_app_passwords) {

        // get the first admin of the users
        var admin = {};
        if(local_app_passwords && typeof local_app_passwords === "object" && Object.keys(local_app_passwords).length > 0) admin = Object.values(local_app_passwords).filter( u => u.role === 'admin')[0];
        
        

        var cNames = {
            'web': `cc-app-${tenant.id}-openproject-web`,
            'db': `cc-app-${tenant.id}-openproject-db`,
            'cache':  `cc-app-${tenant.id}-openproject-cache`,            
            'worker': `cc-app-${tenant.id}-openproject-worker`,
            'cron': `cc-app-${tenant.id}-openproject-cron`,            
            'seeder': `cc-app-${tenant.id}-openproject-seeder`
        }


        var sharedEnv = {
            "OPENPROJECT_HTTPS": "true",
            "OPENPROJECT_HOST__NAME": `openproject-${tenant.id}.${tenant.baseDomain}`,
            "OPENPROJECT_HSTS": "true",
            "RAILS_CACHE_STORE": "memcache",
            "OPENPROJECT_CACHE__MEMCACHE__SERVER": `${cNames.cache}:11211`,
            "OPENPROJECT_RAILS__RELATIVE__URL__ROOT": "",
            "DATABASE_URL": `postgres://postgres:${generatedVars.DB_PASS}@${cNames.db}/openproject?pool=20&encoding=unicode&reconnect=true`,
            "RAILS_MIN_THREADS": 4,
            "RAILS_MAX_THREADS": 16,
            "IMAP_ENABLED": "false"
        }

        
        return {
             // Web
            [cNames.web]: {
                "image": "openproject/openproject",
                "version": "16-slim",
                "restart": "always",
                "depends_on": [cNames.db, cNames.cache, cNames.seeder],
                "env_params": sharedEnv,
                "ports": {
                    8080: { "subdomain": "openproject" }
                },
                "volumes": {
                    "opdata": { internalPath: "/var/openproject/assets", type: "rw" }
                },
                "command": "./docker/prod/web",
                "healthcheck": {
                    "test": ["CMD", "curl", "-f", "http://localhost:8080/health_checks/default"],
                    "interval": "10s",
                    "timeout": "3s",
                    "retries": 3,
                    "start_period": "30s"
                }
            },
            // Database
            [cNames.db]: {
                "image": "postgres",
                "version": "13",
                "restart": "always",
                "stop_grace_period": "3s",               
                "env_params": {
                    "POSTGRES_PASSWORD": `${generatedVars.DB_PASS}`,
                    "POSTGRES_DB": "openproject"
                },
                "volumes": {
                    "pgdata": { internalPath: "/var/lib/postgresql/data", type: "rw" }
                },
            },
            // Cache
            [cNames.cache]: {
                "image": "memcached",
                "version": "latest",
                "restart": "always"
            },
            // Worker
            [cNames.worker]: {
                "image": "openproject/openproject",
                "version": "16-slim",
                "restart": "always",
                "depends_on": [cNames.db, cNames.cache, cNames.seeder],
                "env_params":  sharedEnv,
                "volumes": {
                    "opdata": { internalPath: "/var/openproject/assets", type: "rw" }
                },
                "command": "./docker/prod/worker"
            },

            // CRON
            [cNames.cron]: {
                "image": "openproject/openproject",
                "version": "16-slim",
                "restart": "always",
                "depends_on": [cNames.db, cNames.cache, cNames.seeder],
                "env_params":  sharedEnv,
                "volumes": {
                    "opdata": { internalPath: "/var/openproject/assets", type: "rw" }
                },
                "command": "./docker/prod/cron"
            },

            // Seeder
            [cNames.seeder]: {
                "image": "openproject/openproject",
                "version": "16-slim",
                "restart": "always",
                "env_params":  sharedEnv,
                "volumes": {
                    "opdata": { internalPath: "/var/openproject/assets", type: "rw" }
                },
                "command": "./docker/prod/seeder"
            }
        }
    }

    constructor(CONTEXT) {

        this.con = CONTEXT.con;

    }



    // 2) Will be called after "postinstall" (and on update of a user)
    //
    async upsertUsers(tenant, data, generatedVars = {}, users) {



        const knex = require('knex')({
            client: 'pg',
            connection: {
                host : 'cc-app-cc-openproject-db',
                user : 'postgres',
                password : generatedVars.DB_PASS,
                database : 'openproject'
            }
        });

        var existingUsers = await knex("users");
        console.log(existingUsers);


        for(var x in users){

            let user = users[x];
            
            var update = {
                 login: user.username,
                 mail: user.email,            
                 admin: (user.role === "admin") ? true: false,
                 status: 1,
            };    
            
            var result = await knex('users').where("mail", user.email).update(update);
            console.log(result);

        }       




    
    }


    // 3) Will be called after "upserUsers" on install for the admin users
    //    of the admin-ui AND every time a user permission is changed!
    async updatePermissions(tenant, data, generated_vars, users) {


    }

}

