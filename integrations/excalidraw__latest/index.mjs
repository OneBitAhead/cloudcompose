
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {

        return {
            "name":"Excalidraw", 
            "tech_name": "excalidraw",
            "version": "latest", 
            "color": '#6965db',
            "default_auth_method": "cookie"
        }
    }

    generatedVars(tenant){
        return {}
    }


    getContainers(tenant) {
        return {
            [`cc-app-${tenant.id}-excalidraw`]:{
                "image": "excalidraw/excalidraw", "version": "latest", 
                "description": "",               
                "ports": {
                    80: {"subdomain": "excalidraw"}
                }
            }            
        }
    }


    constructor(CONTEXT) {

    }


}

