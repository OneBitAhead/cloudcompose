/*
Stage 1: Running app, no user integration
*/


export default class Integration {
    // config
    get config() {
        return {
          "name": "Linkwarden",
          "tech_name": "linkwarden",
          "version": "latest",
          "url": "https://linkwarden.app",
          "color": "#072e49",
          "default_auth_method": "cookie",
          "with_local_passwords": true,
          post_install_route: "/register",
          code_injection_urls: [ 
            {   
                "type": "install",
                "patterns":["/register"],
                "replaceString": `<title>Linkwarden</title>`,
                "code": `<title>Installation - Linkwarden (CC)</title>
                    <script>{{injectScript}}</script>
                    <script>                          
                    document.addEventListener("DOMContentLoaded", async()=>{  
                        
                        cloudcomposeDebug(true);

                        // Tell the installing iframe...we are starting
                        installStatus("start"); 


                        const registerNewUserViaCC = async function(){

                            const request = {
                                "name": "{{username}}",
                                "username": "{{username}}",
                                "password":"{{password}}"
                            }
                        
                            const response = await fetch("/api/v1/users", {
                            body: JSON.stringify(request),
                            headers: {
                                "Content-Type": "application/json",
                            },
                            method: "POST",
                            });

                            const data = await response.json();

                            return data
                        
                        }

                        const registerResult = await registerNewUserViaCC();
                        if(registerResult.response && registerResult.response.name){
                            installDone(100); 
                        } else if(registerResult.response && registerResult.response.includes('already')){
                            // User already exists 
                            installDone(100);
                        }
                        
                    })
                    </script>`
            }, 
            {
                "type": "login",
                "patterns":["(.+)?/login"],
                "replaceString": `</body>`,
                "code": `
                  <script>{{injectScript}}</script>
                  <style>form { opacity: .2}</style>
                  <script>

                    document.addEventListener("DOMContentLoaded", async()=>{   

                        cloudcomposeDebug(true);

                        const signInViaCC = async function(){
                        
                            // Get a CSRF token
                            const csrfResponse = await fetch("/api/v1/auth/csrf")
                            const csrfResult = await csrfResponse.json();

                            const request = {
                                "username": "{{username}}",
                                "password": "{{password}}",
                                "redirect": false,
                                "csrfToken": csrfResult.csrfToken,
                                "callbackUrl": window.location.href,
                                "json": true
                            }

                            const response = await fetch("/api/v1/auth/callback/credentials", {
                                body: JSON.stringify(request),
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                method: "POST",
                            });

                            const data = response.status

                            return data

                        }

                        const signinResult = await signInViaCC();

                        if(signinResult < 400){
                            window.location = window.location.origin + '/dashboard'
                        }
                        

                    });
    
                  
                  </script>
                  </body>`
              }            
          ],

        
        }          
    }


     generatedVars(tenant){
        return {
            "DB_PASS": {length:20, specialChars:''},
            "SECRET": {length:20, specialChars:''}
        }
    }



    // needed containers
    getContainers(tenant, generatedVars, local_app_passwords) {

        return {

            [`cc-app-${tenant.id}-linkwarden`]:{
                "image": "ghcr.io/linkwarden/linkwarden",
                "version": "latest", 
                "description": "",
                "ports": {
                    3000: {"subdomain": "linkwarden"}
                },
                "restart": "always",
                "volumes":{
                    "data": { internalPath: "/data/data", type: "rw" },
                },
                "dependsOn": [`cc-app-${tenant.id}-linkwarden-db`],
                "env_params": {
                    DATABASE_URL:`postgresql://postgres:${generatedVars.DB_PASS}@cc-app-${tenant.id}-linkwarden-db:5432/postgres`,
                    NEXTAUTH_URL: `https://linkwarden-${tenant.id}.${tenant.baseDomain}/api/v1/auth`,
                    NEXTAUTH_SECRET: `${generatedVars.SECRET}`
                }
            },
            [`cc-app-${tenant.id}-linkwarden-db`]:{
                "image": "postgres",
                "version": "18-alpine",              
                "description": "",
                "ports": {
                    5432:  {}
                },
                "env_params": {
                    POSTGRES_PASSWORD: 'GENERATED_VAR:DB_PASS',
                    PGDATA: '/var/lib/postgresql/18/docker'
                },
                "restart": "unless-stopped",
                "volumes": {
                    'data': { internalPath: "/var/lib/postgresql", type: 'rw' }
                }
            } 
        }


    }


    constructor(CONTEXT) {

        this.runCommand = CONTEXT.runCommand;  
        this.con = CONTEXT.con;
    }


    async upsertUsers(tenant, data, generated_vars = {}, users) {

        const container = data.containers[`cc-app-${tenant.id}-linkwarden`];
        const internalPort = container.port_mappings[0].internalPort;
        const constants = {
            internalurl: `http://cc-app-${tenant.id}-linkwarden:${internalPort}`
        }

        // Get the user credentials of a admin of this app!         
        var adminCredentials = await this.con.send({"topic": "getLocalAppCredentialsOfAnyAdmin", "tenantId": tenant.id, payload: {"project": `cc-app-${tenant.id}-linkwarden`}});
                   
        
        const adminUser = adminCredentials.username;
        const adminPass = adminCredentials.password;

        log.debug("Integrations", `[LINKWARDEN] AdminUser: ${adminUser}:${adminPass}`);

        const base64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

        for (var x in users) {

            let user = users[x];

            log.debug("Integrations", `[LINKWARDEN] Add user: ${user.email}`);

            try {
                const newUser = {
                    name: user.username,
                    username: user.username,
                    password: user.local_app_password ,
                    email: user.email         
                };
                var resp = await fetch(constants.internalurl + "/api/v1/users", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${base64}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(newUser)
                })
                var data = await resp.json();
                log.debug("Integrations", user, `[LINKWARDEN] User result`);
            } catch (e) {
                log.error("Integrations", e, "[LINKWARDEN] Upsert users");
                return { error: e.toString() }
            }
        }

    }

    async deleteUsers(tenant, data, users) {}

    async updatePermissions(tenant, data, users) {}

}