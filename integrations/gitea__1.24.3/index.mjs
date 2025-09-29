import knex from "knex";
import fs from "node:fs";
        

/**
 * Integration for "gitea" app
 * 
 */
export default class Integration {

    get config() {
        return {
            name: "gitea",
            "tech_name": "gitea",
            "version": "1.24.3",
            // default is keycloak by cookie
            "default_auth_method": "cookie",
            "auth_method_config": {
                "byHeader": {
                    // if user-agent has "git", we use basic-auth method for the endpoint url request!
                    "user-agent": { pattern: "git", flags: "i", auth_method: "basic-auth" }
                }
            },
            // with this...local passwords are generate and can be used in the injected script
            // needed for the upsertUser logic, where ONE admin user credentials are needed!
            "with_local_passwords": true,
            // POSTINSTALL
             // Web route to run for postinstall (AFTER creating and starting the web container)
            post_install_route: "/",
            // therefore the proxy intercepts the return value from the provided URLs and is replacing (if found)
            // auto login urls contain the URL and the replace string
            code_injection_urls: [ 
                // THis script is used for the postinstall (so only injected if the install process is called!)  
                // POSTINSTALL!
                {   
                    "type": "install",
                    "patterns":["/"],
                    "replaceString": `<title>Installation - Gitea</title>`,
                    "code": `<title>Installation - Gitea (CC)</title>
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{  
                            
                            cloudcomposeDebug(true);

                            // Tell the installing iframe...we are starting
                            installStatus("start");

                            let checkbox = document.querySelector('input[name="enable_update_checker"]');
                            console.log(checkbox);
                            if (checkbox) checkbox.checked = true; // or false

                            checkbox = document.querySelector('input[name="require_sign_in_view"]');                            
                            if (checkbox) checkbox.checked = true; // or false      
                            
                            checkbox = document.querySelector('input[name="disable_registration"]');                            
                            if (checkbox) checkbox.checked = true; // or false           


                            checkbox = document.querySelector('input[name="enable_open_id_sign_up"]');                            
                            if (checkbox) checkbox.checked = false; // or false           

                            let input = document.getElementById('admin_name');
                            if (input) input.value = "{{username}}";

                            input = document.getElementById('admin_email');
                            if (input) input.value = "{{email}}";

                            input = document.getElementById('admin_passwd');
                            if (input) input.value = "{{password}}";

                            input = document.getElementById('admin_confirm_passwd');
                            console.log(input);
                            if (input) input.value = "{{password}}";
                                                     
                            // tell "InstallDone" in 20 seconds from now on
                            installDone(10000);                            
                            
                            click('button.primary'); 
                            
                                                 
                            

                      })
                      </script>`
               }             
            ],
            
            // AUTH
            "auth_headers": {
                "X-WEBAUTH-USER": 'USER.username'
            },
            "roles": ["admin", "user"],
            ressources: {
                'CPU': '2 vCPU',
                'RAM': '500 MB',
                'Storage': '20 GB'
            }
        }
    }

    generatedVars(tenant) {
    
    }


    getContainers(tenant) {
        return {
            [`cc-app-${tenant.id}-gitea`]:{            
                "image": "gitea/gitea",
                "version": "1.24.3",              
                "restart": "always",
                "ports": {
                    3000:{"subdomain": "gitea"}
                },
                "env_params": {
                    "APP_NAME": "Gitea",
                    "USER_UID": 1000,
                    "USER_GID": 1000,
                    "RUN_MODE": "prod",
                    // "DOMAIN": '?!',//$IP_ADDRESS,
                    //"SSH_DOMAIN": $IP_ADDRESS,
                    //"SSH_PORT": 222,
                    //"SSH_LISTEN_PORT": 22,
                    "HTTP_PORT": 3000,
                    "ROOT_URL": `https://gitea-${tenant.id}.${tenant.baseDomain}`,
                    "DB_TYPE": "sqlite3",
                    // app.ini settings                    
                    "GITEA__server__TRUSTED_PROXIES": "cc-admin-ui",
                    "GITEA__service__ENABLE_REVERSE_PROXY_AUTHENTICATION": "true",
                    "GITEA__service__REVERSE_PROXY_AUTHENTICATION_USER": "X-WEBAUTH-USER"
                    //"GITEA__service__ENABLE_REVERSE_PROXY_AUTHENTICATION_API":"true"
                },
                "volumes": {
                    "gitea": { internalPath: "/data", type: "rw" }
                }
            }
        }
    }

    constructor(CONTEXT) {

        this.runCommand = CONTEXT.runCommand;  
        this.con = CONTEXT.con;
    }


    async #prepareData(tenant, data) {

        let container = data.containers[`cc-app-${tenant.id}-gitea`];

        this.clientId = data.project;
        var internalPort = container.port_mappings[0].internalPort;
        this.constants = {
            internalurl: `http://cc-app-${tenant.id}-gitea:${internalPort}`
        }
    }


    // 2) Will be called after "postinstall" (and on update of a user)
    //
    async upsertUsers(tenant, data, generated_vars = {}, users) {

        // console.log("UPSERT USERS:", users.length);      
        await this.#prepareData(tenant, data);          
        
        // Get the user credentials of a admin of this app!         
        var adminCredentials = await this.con.send({"topic": "getLocalAppCredentialsOfAnyAdmin", "tenantId": tenant.id, payload: {"project": `cc-app-${tenant.id}-gitea`}});
                   
        
        const adminUser = adminCredentials.username;
        const adminPass = adminCredentials.password;

        log.debug("Integrations", `[GITEA] AdminUser: ${adminUser}:${adminPass}`);

        const base64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

        for (var x in users) {

            let user = users[x];
            log.debug("Integrations", `[GITEA] Add user: ${user.email}`);

            try {
                const newUser = {
                    username: user.username,
                    email: user.email,
                    password: 'securepassword',
                    "must_change_password": false                    
                };
                var resp = await fetch(this.constants.internalurl + "/api/v1/admin/users", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${base64}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newUser)
                })
                var data = await resp.json();
                log.debug("Integrations", user, `[GITEA] User result`);
            } catch (e) {
                log.error("Integrations", e, "[GITEA] Upsert users");
                return { error: e.toString() }
            }
        }
    }
  
    // 3) Will be called after "upserUsers" on install for the admin users
    //    of the admin-ui AND every time a user permission is changed!
    async updatePermissions(tenant, data, generated_vars, users) {


   
        var containerName =  `cc-app-${tenant.id}-gitea`;        
        var dbPath = `/data/manager/container-volumes/${tenant.id}/${containerName}/gitea/gitea/gitea.db`;

        // check if path exists!
        if(!fs.existsSync(dbPath)){
           log.error("Integrations", `[GITEA] DB '${dbPath}' not (yet) existing!`)
           return {error:"db not yet there"}
        }

        
       // Create the connection
        const db = knex({
            client: 'better-sqlite3',
            connection: {
                filename: dbPath,
            },
            useNullAsDefault: true
        });
        
        var result = {};

        for (var x in users) {

            let user = users[x];
            let username = user.username;
            let role = user.appRole;

            try {    
                if(role === "admin"){
                    var update = await db.table("user").where("email", user.email).update({must_change_password:0, is_admin: 1});
                     log.debug("Integrations", `[GITEA] Set admin: ${user.email} ${update}`);
                    result[username] = {success: true};
                } else {
                    var update = await db.table("user").where("email", user.email).update({must_change_password:0, is_admin: 0});                    
                    log.debug("Integrations", `[GITEA] Set user: ${user.email} ${update}`);
                    result[username] = {success: true};
                }             

            } catch (e) {
                log.error("Integrations",e,`[GITEA] Update permission`)
                result[username] = {success: false, error: e.toString()};
            }
        }

        log.debug("Integrations", result, `[GITEA] Result of update permissions`) ;

        return result;

    }

      // Will be called on "deleting" users in admin-ui
    async deleteUsers(tenant, data, generated_vars, users) {

        // Delete user
        log.debug("Integrations", `[GITEA] Delete users: ${users.length}`);     

        await this.#prepareData(data);

        // Get the user credentials of a admin of this app!         
        var adminCredentials = await this.con.send({"topic": "getLocalAppCredentialsOfAnyAdmin", "tenantId": tenant.id, payload: {"project": `cc-app-${tenant.id}-gitea`}});
                
        const adminUser = adminCredentials.username;
        const adminPass = adminCredentials.password;

        log.debug("Integrations", `[GITEA] AdminUser: ${adminUser}:${adminPass}`);
                  
        const base64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

        for (var x in users) {

            let user = users[x];
            log.debug("Integrations", `[GITEA] Delete user: ${user.email}`);
            
            try {
                var username = user.username;
                var resp = await fetch(this.constants.gitea.internalurl + `/api/v1/admin/users/${username}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Basic ${base64}`,
                        'Content-Type': 'application/json'
                    }                    
                })                
                if(resp.status >= 400){
                    return { error: await resp.toString() }                    
                }              
            } catch (e) {
                log.error("Integrations", e, "[GITEA] Delete users");
                return { error: e.toString() }
            }
        }


    }


}

