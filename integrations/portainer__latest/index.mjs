
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {


        return {
            "name": "Portainer Community Edition (CE)",
            "tech_name": "portainer",
            "version": "latest",
            "url": "https://www.portainer.io",
            "color": "#bb83fb",
            "default_auth_method": "cookie",     
            "auth_method_config": {
                "byHeader": {
                    // if user-agent has "Docker-Client" or "curl" in the header --> use basic auth
                    "x-api-usage": { pattern: "true", flags: "i", auth_method: "basic-auth" }                   
                }      
            }, 
            // local passwords!
            "with_local_passwords": true,  
            "roles": ["admin", "user"],     
            // ....
            auth_exception_urls: [
                "/manifest.json"
            ],
            // Web route to run for postinstall (AFTER creating and starting the web container)
            post_install_route: "/",
            // therefore the proxy intercepts the return value from the provided URLs and is replacing (if found)
            // auto login urls contain the URL and the replace string
            code_injection_urls: [ 
                // THis script is used for the postinstall (so only injected if the install process is called!)  
                // POSTINSTALL!
                {   
                    "type": "install",
                    "patterns":["/$"],
                    "replaceString": `<title>Portainer</title>`,
                    "code": `<title>Portainer (CC)</title>
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{   
                            
                            cloudcomposeDebug(true);

                            // install or login?
                            // Tell the installing iframe...we are starting
                            installStatus("start");
                            
                            //Administrator Email
                            await emulateTyping("#username", "{{username}}");
                            // Password
                            await emulateTyping('#password', "{{password}}")

                            
                            // do we have a confirm_password field?
                            var confirm = document.querySelector('#confirm_password');
                            if(!confirm){
                                click('button.btn-primary');  

                            } else if(confirm){

                                // Confirm Password
                                await emulateTyping('#confirm_password', "{{password}}")

                                // Switch off telemtry
                                var input = document.querySelector('input[name="toggle_enableTelemetry"]');                                
                                if(input.checked === true){
                                    click('input[name="toggle_enableTelemetry"]');
                                }
                                    
                                await sleep(1000);
                                // wait for 5 seconds (in the parent!!!)
                                installDone(5000);
                                click('button.btn-primary');    
                            
                            }


                                                                           
                            

                      })
                      </script>`
               }
            ]
        }
    }





    getContainers(tenant) {
        return {
            [`cc-app-${tenant.id}-portainer`]:{
                "image": "portainer/portainer-ce",
                "version": "latest",
                "restart": "always",
                "ports": {
                    9000: { "subdomain": "portainer" }
                },
                "env_params": {                    
                },
                "volumes": {                    
                    "docker-socket": { externalPath: "/var/run/docker.sock", internalPath: "/var/run/docker.sock", type: "ro" },
                    "data": { internalPath: "/data", type: "rw"}
                },
            }
        }
    }

    constructor(CONTEXT) {

        this.con = CONTEXT.con;

    }

    generatedVars(tenant){
        return {}
    }


    async #getToken(tenant, BASE_URL){
        
        var project = `cc-app-${tenant.id}-portainer`;
        // Get the user credentials of a admin of this app!         
        var adminCredentials = await this.con.send({"topic": "getLocalAppCredentialsOfAnyAdmin", "tenantId": tenant.id, payload: {"project": project}});
        try{
            // get JWT auth token
            var response = await fetch(BASE_URL+"/api/auth",{
                method: "POST",
                body: JSON.stringify({"username": adminCredentials.username, "password": adminCredentials.password})
            });
            var data = await response.json();        
            return data.jwt;                      

        }catch(e){
            throw e;
        }
    }

    async #addUser(token, BASE_URL, user){

        try{            
            var response = await fetch(BASE_URL+"/api/users",{
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "username": user.username, 
                    "password": user.local_app_password,
                    "role": (user.role === "admin") ? 1: 2
                })
            });
            var data = await response.json();        
                    

        }catch(e){
            throw e;
        }
    }

    async #getUserIdByName(token, BASE_URL, username){
        
        try{
            var response = await fetch(BASE_URL+`/api/users`,{
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            var data = await response.json();                             
            for(var x in data){
                if(data[x].Username === username) return data[x].Id;
            }
            return null;

        }catch(e){
            throw e;
        }



    }

    async #updateUserRole(token, BASE_URL, userId, appRole){

        try{

            var response = await fetch(BASE_URL+`/api/users/${userId}`,{
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "role": (appRole === "admin") ? 1: 2
                })
            });
            var data = await response.json();       
                             
        }catch(e){
            throw e;
        }
    }



    
    // 2) Will be called after "postinstall" (and on update of a user)
    //
    async upsertUsers(tenant, data, generated_vars = {}, users) {

        var project = `cc-app-${tenant.id}-portainer`;
        //var port = data.containers[project].externalPorts[0];
        var BASE_URL = `http://${project}:9000`;               
       
        try{
            var token = await this.#getToken(tenant, BASE_URL);
            // add users
            for(var x in users){
                await this.#addUser(token, BASE_URL, users[x]);
            }    
        }catch(e){
            console.log(e);
        }
    }


     // 3) Will be called after "upserUsers" on install for the admin users
    //    of the admin-ui AND every time a user permission is changed!
    async updatePermissions(tenant, data, generated_vars, users) {

        var project = `cc-app-${tenant.id}-portainer`;
        //var port = data.containers[project].externalPorts[0];
        var BASE_URL = `http://${project}:9000`;               

        try{
            var token = await this.#getToken(tenant, BASE_URL);
            // add users
            for(var x in users){
                var userId = await this.#getUserIdByName(token, BASE_URL, users[x].username);
                await this.#updateUserRole(token, BASE_URL, userId, users[x].appRole);
            }    
        }catch(e){
            console.log(e);
        }




    }

}

