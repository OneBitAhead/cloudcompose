const require = createRequire(import.meta.url);
import { createRequire } from 'node:module';
const crypto = require("node:crypto");

import { default as updateWiki } from './src/configureWikijs.mjs';



/**
 * Integration for "wikijs_mariadb" app
 * 
 */
export default class Integration {

    #keycloak;

    // config
    get config() {
        return {
            "name": "Wiki.js",
            "tech_name": "wikijs_mariadb",
            "version": "2.5.0",
            "url": "https://js.wiki",
            "color": "#0c8ecb",
            "default_auth_method": "built-in",
            "with_local_passwords": true,
            "start_url": "/login",

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
                    "replaceString": `<title>Wiki.js Setup</title>`,
                    "code": `<title>Wiki.js Setup (CC)</title>
                      <script>{{injectScript}}</script>
                      <script>                          
                        document.addEventListener("DOMContentLoaded", async()=>{   
                            
                            cloudcomposeDebug(true);
                            
                            // Tell the installing iframe...we are starting
                            installStatus("start");
                            
                            //Administrator Email
                            await emulateTyping("#input-11", "{{email}}");
                            // Password
                            await emulateTyping('#input-14', "{{password}}")
                            // Confirm Password
                            await emulateTyping('#input-18', "{{password}}")

                            // Site URL
                            document.querySelector("#input-23").value = "";
                            var input = document.querySelector("#input-23");
                            await emulateTyping('#input-23', window.location.origin);  
                            
                            // Switch off telemtry
                            var input = document.querySelector("#input-27");
                            console.log(input.value);
                            if(input.checked === true){
                                click("#input-27");
                            }
                            
                            await sleep(1000);
                            // wait for 60 seconds (in the parent!!!)
                            
                            installDone(60000);
                            click('button.primary');                                                    
                            

                      })
                      </script>`
               },
               // AUTOLOGIN             
               {
                "type": "login",
                "patterns":["^/login"],
                "replaceString": `<meta property="og:image">`,
                "code": `<meta property="og:image">
                  <script>{{injectScript}}</script>
                  <script>
                    document.addEventListener("DOMContentLoaded", async()=>{   

                        cloudcomposeDebug(true);

                        await sleep(1000);
                        // if logged in (header is set with dropdown user)
                        var loginDiv = document.querySelector("div.login");                     
                        if(!loginDiv){
                            console.log("Logged in already");                    
                            return;
                        }        

                        await emulateTyping("#input-20","{{email}}");         
                        await emulateTyping("#input-22","{{password}}"); 
                        click('button.blue');


                    });
    
                  
                  </script>`
              }            
            ],

            "roles": ["admin","user"],
            "stack_name": "wiki",
            "ressources": {
                'CPU': '2 vCPU',
                'RAM': '1 GB',
                'Storage': '1 GB'
            }
        }
    }


    generatedVars(tenant){
        
        return {
            "DB_PASS": {length:20, specialChars:''}
        }

    }
    
    // needed containers
    getContainers(tenant) {
                
        return {
            [`cc-app-${tenant.id}-wikijs`]: {
                "image": "ghcr.io/requarks/wiki", 
                "version": "2",             
                "depends_on": [`cc-app-${tenant.id}-wikijs-db`],
                "description": "",
                "ports": {
                    3000: { subdomain: "wiki"}
                },
                "env_params": {
                    DB_TYPE: "mariadb",
                    DB_HOST: `cc-app-${tenant.id}-wikijs-db`,
                    DB_PORT: 3306,
                    DB_NAME: 'wiki',
                    DB_USER: 'wikijs',   
                    DB_PASS: 'GENERATED_VAR:DB_PASS'                 
                }
            },
           [`cc-app-${tenant.id}-wikijs-db`]: {
                "image": "mariadb",
                "version": "11.8",              
                "description": "",
                "ports": {
                    3306:  {}
                },
                "env_params": {
                    MYSQL_ROOT_PASSWORD: "root",
                    MYSQL_DATABASE: "wiki",
                    MYSQL_USER: "wikijs",
                    MYSQL_PASSWORD: 'GENERATED_VAR:DB_PASS'
                },
                "restart": "unless-stopped",
                "volumes": {
                    'db-data': { internalPath: "/var/lib/mysql/data", type: 'rw' }
                }
            }
        }
    }

    constructor(CONTEXT) {
        // is contained in the CONTEXT
        this.#keycloak = CONTEXT.keycloak;
    }

    async #prepareData(tenant, data) {

        console.log(data);

        let dbContainer = data.containers[`cc-app-${tenant.id}-wikijs-db`];

        console.log(dbContainer);

        this.clientId = data.project;
        this.uuid = data.uuid;
        this.externalurl = `https://wiki-${tenant.id}.${tenant.baseDomain}`;
        this.internalurl = `http://cc-app-${tenant.id}-wikijs:3000`;
        
        this.constants = {
            wikijs: {
                internalurl: this.internalurl,
                url: this.externalurl                
            },
            wikijsdb: {
                db: {
                    host: `cc-app-${tenant.id}-wikijs-db`,
                    port: 3306,
                    user: dbContainer.environment.MYSQL_USER,
                    password: dbContainer.environment.MYSQL_PASSWORD,
                    database: dbContainer.environment.MYSQL_DATABASE
                },
                replacements: {
                    uuid: this.uuid,
                    now: (new Date()).toISOString(),
                    iamUrl: `https://${process.env.KC_DOMAIN}`,
                    realm: tenant.id,
                    clientid: this.clientId,
                    clientsecret: ''
                }
            },
            keycloak: {
                name: this.clientId,
                url: this.externalurl,
                uuid: this.uuid
            }
        }
    }


    async postinstall(tenant, data) {

        // console.log("RUN SQL STATEMENTS")
        await this.#prepareData(tenant, data);

        try {
            await updateWiki.runInitSQL( this.constants.wikijsdb)
        } catch (e) {
            console.log(e);
        }


    }


    async upsertUsers( tenant, data, generated_vars = {}, users ) {

        await this.#prepareData(tenant, data);

        try {
            await updateWiki.upsertUsers( this.constants.wikijsdb, users)
        } catch (e) {
            console.log(e);
        }
    }

    async deleteUsers( tenant, data, generated_vars = {}, users ) {
        await this.#prepareData(data);

        try {
            await updateWiki.deleteUsers( this.constants.wikijsdb, users)
        } catch (e) {
            console.log(e);
        }
    }

    updatePermissions( tenant, data, generated_vars = {}, users){

        // testing
        // console.log(data)
        // console.log("UPDATE PERMISSIONS in HELLO WORLD: ", users)
        
    }

}

