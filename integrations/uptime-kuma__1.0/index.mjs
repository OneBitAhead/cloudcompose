const require = createRequire(import.meta.url);
import { createRequire } from 'node:module';


/**
 * Integration for "uptime-kuma" app
 * 
 */
export default class Integration {
 
    get config() {
        return {
            "name": "Uptime Kuma",
            "tech_name": "uptime-kuma",
            "version": "1.0",
            "url": "https://uptime.kuma.pet",
            color: "#76db86",
            img: "data:image/png;base64,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",
            ressources: {
                'CPU': '2 vCPU',
                'RAM': '2 GB',
                'Storage': '20 GB'
            },
            // AUTH
            default_auth_method: "cookie", 
            // these URLs are NOT checked by the proxy...and can be fetched without any login PUBLICLY!!!
            auth_exception_urls: [
                "/manifest.json",
                "/icon.svg",
                // frontend assets
                "/assets/",
                // public dashboards
                "/status/public-",
                "/api/status-page/heartbeat/public-",
                "/api/status-page/public-"
            ],
            // Web route to run for postinstall (AFTER creating and starting the web container)
            post_install_route: "/setup",
            // therefore the proxy intercepts the return value from the provided URLs and is replacing (if found)
            // auto login urls contain the URL and the replace string
            code_injection_urls: [ 
                // THis script is used for the postinstall (so only injected if the install process is called!)  
                // POSTINSTALL!
                {   
                    "type": "install",
                    "patterns":["/setup"],
                    "replaceString": `<title>Uptime Kuma</title>`,
                    "code": `<title>Uptime Kuma</title>
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{   
                            
                            cloudcomposeDebug(true);
                            
                            // Tell the installing iframe...we are starting
                            installStatus("start");
                            
                            await emulateTyping("#floatingInput","cloudcompose@cloudcompose.de");                           
                            await emulateTyping("#floatingPassword","{{autologin_password}}");                           
                            await emulateTyping("#repeat","{{autologin_password}}");                        
                            // await sleep(1000);

                            installDone(2000);
                            click('button[type="submit"]');  
                                                  
                            

                      })
                      </script>`
               },
               // AUTOLOGIN             
               {
                "type": "login",
                "patterns":["/dashboard"],
                "replaceString": `<title>Uptime Kuma</title>`,
                "code": `<title>Uptime Kuma</title>
                  <script>{{injectScript}}</script>
                  <script>

                    document.addEventListener("DOMContentLoaded", async()=>{   

                        cloudcomposeDebug(true);
                      
                        // if logged in (header is set with dropdown user)
                        var userMenu = document.querySelector("#app  header ul li");                      
                        if(userMenu){
                            console.log("Logged in already");                    
                            return;
                          }                          
                        await emulateTyping("#floatingInput","cloudcompose@cloudcompose.de");         
                        await emulateTyping("#floatingPassword","{{autologin_password}}"); 

                        click('form button.btn-primary');
                        installStatus("alreadyDone")

                    });
    
                  
                  </script>`
              }
            ]
        }
    }

    generatedVars(tenant){
        
        return {
            "autologin_password": {length:20, specialChars:''}           
        }

    }


    getContainers(tenant, generatedVars, local_app_passwords) {


        return {
            [`cc-app-${tenant.id}-uptime-kuma`]: {
                "image": "louislam/uptime-kuma",
                "version": "1",
                "ports": {
                    3001: { subdomain: "uptime-kuma"}
                },
                volumes: {
                    "uptime-kuma-data": { internalPath: "/app/data", type: "rw" }
                }
            }
        }
    }


    constructor(CONTEXT) {      
    }

    // async postinstall(tenant, data) {
    // }

    // async addUser() {
    // }

    // async deleteUser() {
    // }

}

