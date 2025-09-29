/*
Stage 1: Running app, no user integration
*/


export default class Integration {
    // config
    get config() {
        return {
          "name": "",
          "tech_name": "",
          "version": "latest",
          "url": "",
          "color": "#000000",
          "default_auth_method": "cookie",
        //   "with_local_passwords": true,
        //   code_injection_urls: [{
        //     patterns: [],
        //     replaceString: `gibt es nicht`,
        //     code: ``
        // }]
        }          
    }


     generatedVars(tenant){
        return {
            "DB_PASS": {length:20, specialChars:''}
        }
    }



    // needed containers
    getContainers(tenant, generatedVars, local_app_passwords) {
        return {
            [`cc-app-${tenant.id}-`]:{
                "image": "",
                "version": "latest", 
                "description": "",
                "ports": {
                    // 0: {"subdomain": ""}
                },
                "restart": "always",
                "volumes":{
                    // "": { internalPath: "", type: "rw" },
                },
                //"dependsOn": [`cc-app-${tenant.id}-linkwarden-db`],
                "env_params": {
                }
            },
        }
    }


    constructor(CONTEXT) {

    }

    async upsertUsers(tenant, data, users) {}

    async deleteUsers(tenant, data, users) {}

    async updatePermissions(tenant, data, users) {}

}