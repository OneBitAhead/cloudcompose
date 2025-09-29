
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {


        return {            
            "name": "draw.io",
            "tech_name": "drawio",
            "version": "latest",
            "url": "https://www.drawio.com/",
            "color": "#f08705",
            "default_auth_method": "cookie",
            // these URLs are NOT checked by the proxy...and can be fetched without any login PUBLICLY!!!
            auth_exception_urls: [
                "/manifest.json"             
            ],
        }     
    }


    getContainers(tenant) {
        return {

            [`cc-app-${tenant.id}-drawio`]:{
                "image": "jgraph/drawio",
                "version": "latest",            
                "restart": "always",
                "ports": {
                    8080: {"subdomain": "drawio"}
                },
                "env_params": {               
                  KEYSTORE_PASS: "Very1nS3cur3P4ssw0rd",
                  PUBLIC_DNS: 'cloudcompose.de',
                  // DRAWIO_SERVER_URL: '',
                  // DRAWIO_BASE_URL: '',
                },
                "volumes": {   
                    "./public_userfiles":  {internalPath: "/var/www/html/public/userfiles", type: "rw"},  
                    "./userfiles":  {internalPath: "/var/www/html/userfiles", type: "rw"} , 
                    "./plugins":  {internalPath: "/var/www/html/app/Plugins", type: "rw"}                
                },
            }
        }
    }

    constructor(CONTEXT) {

    }


}

