
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {


        return {
            "name": "dozzle",
            "tech_name": "dozzle",
            "version": "latest",
            "url": "https://www.dozzle.dev",
            "color": "#f08705",
            "default_auth_method": "cookie",
            "auth_headers": {
                "Remote-User": 'USER.username',
                "Remote-Email": 'USER.email'               
            },
            // ....
            auth_exception_urls: [
                "/manifest.json"
            ],
        }
    }

    getContainers(tenant) {
        return {
            [`cc-app-${tenant.id}-dozzle`]:{
                "image": "ghcr.io/amir20/dozzle",
                "version": "latest",
                "restart": "always",
                "ports": {
                    8080: { "subdomain": "dozzle" }
                },
                "env_params": {
                    "DOZZLE_AUTH_PROVIDER": "forward-proxy"                  
                },
                "volumes": {
                    // links to an already existing path (or it will be created by docker!) reachable under "/a" from within the container
                    "docker-socket": { externalPath: "/var/run/docker.sock", internalPath: "/var/run/docker.sock", type: "ro" },
                    "data": { internalPath: "/data", type: "rw"}
                },
            }
        }
    }

    constructor(CONTEXT) {

    }

    generatedVars(tenant){
        return {}
    }

}

