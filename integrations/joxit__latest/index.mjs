
/**
 * Integration for "gitea" app
 * 
 * 
 * 
 * TODO: When opening joxit
 * 
 * Error occured: Check your connection and your registry must have `Access-Control-Allow-Origin` header set to `https://joxit-cc.local2.cloudcompose.de`
 */
export default class Integration {

    get config() {
        return {
            "name": "Joxit",
            "tech_name": "joxit",
            "version": "latest",           
            "url": "https://joxit.dev/docker-registry-ui/",
            "color": "#00a576",            
            "default_auth_method": "cookie",                        
            "auth_method_config": {
                "byHeader": {
                    // if user-agent has "Docker-Client" or "curl" in the header --> use basic auth
                    "user-agent": { pattern: "Docker-Client|curl", flags: "i", auth_method: "basic-auth" }                   
                }                
                /*"byURL": {
                    // if user-agent has "git", we use basic-auth method for the endpoint url request!
                    "v2": { pattern: "^/v2/.*$", flags: "i", auth_method: "basic-auth" }
                }*/
            },
            /*
            "auth_headers": {
                "X-WEBAUTH-USER": 'USER.username'
            },*/            
            ressources: {
                'CPU': '2 vCPU',
                'RAM': '500 MB',
                'Storage': '20 GB'
            }
        }
    }

    generatedVars(tenant) {
    }


    getContainers(tenant) {        

        return {

            [`cc-app-${tenant.id}-joxit`]: {
                "image": "joxit/docker-registry-ui",
                "version": "main",              
                "restart": "always",
                "ports": {
                    80: {"subdomain": "joxit"}
                },
                "env_params": { 
                    "REGISTRY_TITLE":"Docker Registry UI",
                    "REGISTRY_URL": `https://joxit-${tenant.id}.${tenant.baseDomain}`,
                    "SHOW_CONTENT_DIGEST": true,
                    "DELETE_IMAGES": true,
                    "NGINX_PROXY_PASS_URL": `http://cc-app-${tenant.id}-joxit-server:5000`,
                    "SINGLE_REGISTRY": true,
                    "SHOW_CATALOG_NB_TAGS":true,
                    "CATALOG_MIN_BRANCHES": 1,
                    "CATALOG_MAX_BRANCHES": 1,
                    "TAGLIST_PAGE_SIZE": 100,
                    "REGISTRY_SECURED": false,
                    "CATALOG_ELEMENTS_LIMIT": 1000
                }
            },            
            [`cc-app-${tenant.id}-joxit-server`]:{
                "image": "registry",
                "version": "3",               
                "restart": "always",
                "env_params": { 
                    "OTEL_TRACES_EXPORTER": "none"
                },
                "volumes": {
                    "storage": {internalPath: "/var/lib/registry", type: "rw"},
                    "config.yml": {internalPath: "/etc/docker/registry/config.yml", type: "ro"}
                }
          }
        }
    }

    constructor(CONTEXT) {
 
    }


    async #prepareData(data) {
    }


    async postinstall(tenant, data) {
    }


    async upsertUsers(enant, data, generated_vars = {}, users) {
    }

    async deleteUsers(tenant, data, generated_vars = {}, users) {
    }
    
    async updatePermissions(enant, data, generated_vars = {}, users) {
    }


}

