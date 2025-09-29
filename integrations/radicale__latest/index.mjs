import * as path from 'node:path';
import * as fsp from 'node:fs/promises';

export default class Integration {

    get config() {
        return {
            "name": "Radicale",
            "tech_name": "radicale",
            "version": "latest",
            "url": "https://radicale.org/v3.html/",
            "color": "#a40000",
            "default_auth_method": "cookie",
            "with_local_passwords": true,
            "auth_method_config": {
                "byURL": [
                    // if user-agent has "git", we use basic-auth method for the endpoint url request!
                    { pattern: ".+(addressbook|calendar|shared-calendar)", flags: "i", auth_method: "basic-auth" }
                ]
            }, 

            // AUTH
            // "auth_headers": {
            //     //"X-Remote-User": 'USER.username',
            //     "X-Script-Name": "/radicale"
    
            // },

            code_injection_urls: [                
               // AUTOLOGIN             
               {
                "type": "login",
                "patterns":["/.web/"],
                "replaceString": `<title>Radicale Web Interface</title>`,
                "code": `<title>Radicale Web Interface</title>
                  <script>{{injectScript}}</script>
                  <script>

                    document.addEventListener("DOMContentLoaded", async()=>{   

                        cloudcomposeDebug(true);
                        console.log("{{email}},{{password}}")
                        await sleep(10);                    

                        await emulateTyping('#loginscene input[data-name="user"]',"{{email}}");                                                       
                        await emulateTyping('input[data-name="password"]',"{{password}}"); 
                        
                        click('#loginscene form button.green[type="submit"]');
                        

                    });
    
                  
                  </script>`
              }
            ]
        }
    }

    getContainers(tenant) {

        return {
            [`cc-app-${tenant.id}-radicale`]: {
                "image": "tomsquest/docker-radicale",
                "version": "latest",
                "dependsOn": [],
                "description": "CalDav & CardDav Server",
                "ports": {
                    5232: { subdomain: "radicale" }
                },
                "env_params": {
                    RADICALE_CONFIG: "/etc/radicale/config"
                },
                "volumes": {
                    "data-directory": { internalPath: "/data", type: "rw" },
                    "config-directory": { sourcePath: "./configuration", internalPath: "/etc/radicale", type: "ro" },
                    "config": { sourcePath: "./configuration/config", internalPath: "/config/config", type: "ro" },
                    "users": { sourcePath: "./configuration/users", internalPath: "/etc/radicale/users", type: "ro" },
                    "rights": { sourcePath: "./configuration/rights", internalPath: "/etc/radicale/rights", type: "ro" },
                }

            }
        }
    }

    constructor(CONTEXT) {

    }

    async postinstall(tenant, data) { }



    async #readUsersFile(tenant) {

        // read users file from volume
        var file = path.join(process.env.F_container_volumes, tenant.id, `cc-app-${tenant.id}-radicale`, 'users', 'users');
        var existingUsers = (await fsp.readFile(file)).toString().split("\n");

        // existing
        var userObj = {};
        for (var x in existingUsers) {
            if(existingUsers[x].trim()==="") continue;
            let s = existingUsers[x].split(":");
            userObj[s[0]] = s[1];
        }

        return userObj;

    }

    async #writeUsersFile(tenant, userObj) {

        var file = path.join(process.env.F_container_volumes, tenant.id, `cc-app-${tenant.id}-radicale`, 'users', 'users');
        var content = [];
        for (var x in userObj) {
            
            content.push(`${x}:${userObj[x]}`);
        }
        await fsp.writeFile(file, content.join("\n"));

    }



    async upsertUsers(tenant, data, generated_vars = {}, users) {
        console.log('upsertUsers: radicale', users, data)

        var userObj = await this.#readUsersFile(tenant);

        // Upsert:
        for (var x in users) {
            userObj[users[x].email] = users[x].local_app_password;
        }

        // write back!
        await this.#writeUsersFile(tenant, userObj);

    }

    async deleteUsers(tenant, data, generated_vars = {}, users) {
        console.log('deleteUsers', users, data)
    }

    updatePermissions(tenant, data, generated_vars = {}, users) {

        // testing
        console.log(data)
        console.log("UPDATE PERMISSIONS in HELLO WORLD: ", users)

    }

}