/*
Stage 1: Running app, no user integration
*/


export default class Integration {
    // config
    get config() {
        return {
          "name": "NocoDB",
          "tech_name": "nocodb",
          "version": "latest",
          "url": "https://nocodb.com",
          "color": "#393adc",
          "default_auth_method": "cookie",
        //   "with_local_passwords": true,
        //   code_injection_urls: [{
        //     patterns: [],
        //     replaceString: `gibt es nicht`,
        //     code: ``
        // }]

        post_install_route: null,
        code_injection_urls: [],

         // POSTINSTALL
             // Web route to run for postinstall (AFTER creating and starting the web container)
            // post_install_route: "/dashboard",
            // code_injection_urls: [ {
            //     "type": "install",
            //     "patterns":["/dashboard"],
            //     "replaceString": `<div id="teleports"></div>`,
            //     "code": `<div id="teleports"></div>
            //     <script>{{injectScript}}</script>
            //     <script>                          
            //     document.addEventListener("DOMContentLoaded", async()=>{  
                            
            //         cloudcomposeDebug(true);

            //         // Tell the installing iframe...we are starting
            //         installStatus("start");

            //         //let input = document.getElementById('form_item_email');
            //         await emulateTyping("#form_item_email","{{tech_admin_name}}");    
            //        await emulateTyping("#form_item_password","{{tech_admin_password}}");

            //         //let input2 = document.getElementById('form_item_password');
            //         //if (input2) input2.value = "{{tech_admin_password}}";

                    
            //     })
            //     </script>`


            // }
            // ]

        }          
    }


     generatedVars(tenant){
        return {
            "DB_PASS": {length:20, specialChars:''},
            "tech_admin_email": `tech_admin@${tenant.baseDomain}`,
            "tech_admin_password": {length:20, specialChars:''}  
        }
    }



    // needed containers
    getContainers(tenant) {

        return { 
            [`cc-app-${tenant.id}-nocodb`]: {
                "image": "nocodb/nocodb",
                "version": "latest",          
                "restart": "always",
                "depends_on": [`cc-app-${tenant.id}-nocodb_db`],
                "ports": {
                    8080: {"subdomain": "nocodb"}
                },
                "env_params": { 
                    "NC_DB": `mysql2://cc-app-${tenant.id}-nocodb_db:3306?u=nocodb_technical_user&p=nocodb_secret_password&d=nocodb`,
                    //"NC_DB": "pg://root_db:5432?u=postgres&p=password&d=root_db"
                    NC_DISABLE_TELE: true,
                    NC_DISABLE_SUPPORT_CHAT: true,
                    NC_PUBLIC_URL: `https://nocodb-${tenant.id}.${tenant.baseDomain}`,
                    NC_IFRAME_WHITELIST_DOMAINS: `*.${tenant.baseDomain}`,
                    NC_ADMIN_EMAIL: `tech_admin@${tenant.baseDomain}`,
                    NC_ADMIN_PASSWORD: `supEr_Secret_tech_4dmin_pasSWord`,
                    NC_AUTH_JWT_SECRET: 'jzu7bvtcercxdgt'

                },

            },
            [`cc-app-${tenant.id}-nocodb_db`]: {
                "image":"mariadb", 
                "version": "11.4", 
                "restart": "always",
                "description": "",                 
                "env_params": {  
                    "MYSQL_DATABASE":"nocodb",
                    "MYSQL_USER":"nocodb_technical_user",
                    "MYSQL_PASSWORD": 'nocodb_secret_password',
                    "MYSQL_ROOT_PASSWORD":"root"                    
                },                
                "volumes": {   
                    "data":  {internalPath: "/var/lib/mysql", type: "rw"},                                     
                }  
            }

        }

    }


    constructor(CONTEXT) {
    }

    async upsertUsers(tenant, data, users) {}

    async deleteUsers(tenant, data, users) {}

    async updatePermissions(tenant, data, users) {}

}