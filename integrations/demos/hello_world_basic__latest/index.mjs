
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {
        return {
            name: "Hello World (basic-auth)",
            "tech_name": "hello_world_basic",
            "version": "latest",
            default_auth_method: "basic-auth",
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
            [`cc-app-${tenant.id}-hello1`]:{            
                "image": "crccheck/hello-world",
                "ports": {
                    8000: {subdomain: "hello"}
                }
            }
        }
    }

    constructor(CONTEXT) {

    }


}

