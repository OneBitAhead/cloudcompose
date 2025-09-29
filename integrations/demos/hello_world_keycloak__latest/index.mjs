
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {
        return {
            name: "Hello World (keycloak)",
            "tech_name": "hello_world_keycloak",
            "version": "latest",
            default_auth_method: "cookie",            
            "multi_instance": true,
            ressources: {
                'CPU': '0.1 vCPU',
                'RAM': '50 MB',
                'Storage': '0 GB'
            }
        }
    }


    getContainers(tenant) {
        return {
           [`cc-app-${tenant.id}-hello2`]:{
                "image": "crccheck/hello-world",
                "ports": {
                    8000: {"subdomain": "hello"}                    
                }

            }
        }
    }

    constructor(CONTEXT) {

    }



}

