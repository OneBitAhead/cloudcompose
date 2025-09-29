/*
Stage 1: Running app, no user integration
*/

export default class Integration {
    // config
    get config() {
        return {
          "name": "Metabase",
          "tech_name": "metabase",
          "version": "latest",
          "url": "https://www.metabase.com",
          "color": "#509ee3",
          "default_auth_method": "cookie",
          "fw_types": ["db-tool"],
          "ressources": JSON.stringify({
            'CPU': '2 vCPU',
            'RAM': '4 GB',
            'Note': 'Information are the combined requirements for application and database server and represent the recommendations for about 20 concurrent users'
          }),
          "with_local_passwords": true,
          code_injection_urls: [{
            patterns: [],
            replaceString: `gibt es nicht`,
            code: ``
        }]
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
         [`cc-app-${tenant.id}-metabase`]: {
            "image": "metabase/metabase",
            "version": "latest",          
            "restart": "always",
            "ports": {
              3000: {"subdomain": "metabase"}
            },
            "depends_on": [`cc-app-${tenant.id}-metabase_db`],
            "env_params": {
                DB_TYPE: "mysql",
                DB_HOST: `cc-app-${tenant.id}-metabase_db`,
                DB_PORT: 3306,
                DB_NAME: 'metabase',
                DB_USER: 'metabase_user',
                DB_PASS: 'GENERATED_VAR:DB_PASS'
            },
            "volumes":{   
                "urandom":  {internalPath: "/dev/random", type: "ro"}                   
            }
         },
         [`cc-app-${tenant.id}-metabase_db`]:{
                "image":"mariadb", 
                "version": "11.4", 
                "restart": "always",
                "description": "",                 
                "env_params": {  
                    "MYSQL_DATABASE":"metabase",
                    "MYSQL_USER":"metabase_user",
                    "MYSQL_PASSWORD": 'GENERATED_VAR:DB_PASS',
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

