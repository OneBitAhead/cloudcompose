
/**
 * Integration for "helo world" app
 * 
 */
export default class Integration {

    get config() {
        return {
            name: "Hello World (none)",
            "tech_name": "hello_world_none",
            "default_auth_method": "none",
            "version": "latest",
            "multi_instance": true,
            "ressources": {
                'CPU': '0.1 vCPU',
                'RAM': '50 MB',
                'Storage': '0 GB'
            },
            // "pricing": [
            //     {type: 'm', headline: 'Monthly billing', description: '', value: 2, unit: '€ / mon'},
            //     {type: '6m', headline: 'Semiannual billing', description: 'Save 5%', value: 1.9, unit: '€ / mon'},
            //     {type: '12m', headline: 'Annual billing', description: 'Save 10%', value: 1.8, unit: '€ / mon'}
            // ]
        }
    }


    generatedVars(tenant){
        
        return {
            "TEST_VAR": {length:10},
            "TEST_VAR_WITOUT_SPECIAL_CHARS": {length:20, specialChars:''},
            "TEST_UUID": {uuid: true},
        }

    }


    getContainers(tenant) {
        return {
            [`cc-app-${tenant.id}-hello3`]:{
                "image": "crccheck/hello-world",
                "ports": {
                    8000: {"subdomain": "hello"}
                },
                healthcheck: {
                    disable: true
                },
                "env_params": {
                    A: 'GENERATED_VAR:TEST_VAR',
                    B: 'GENERATED_VAR:TEST_VAR_WITOUT_SPECIAL_CHARS',
                    C: 'GENERATED_VAR:TEST_UUID'
                },
                "volumes":{
                    // create an empty fresh folder in the mount folder reachable under "/a" from within the container
                    "a": { internalPath: "/a", type: "rw"},
                    // links to an already existing path (or it will be created by docker!) reachable under "/a" from within the container
                    "b": { externalPath: "/tmp", internalPath: "/tmp", type: "rw"},
                    // copies the relative found folder "./config" from the integrations folder 
                    // into the mount folder and reachable under "/config" from within the container
                    "c": { sourcePath: "./config", internalPath: "/config", type: "ro"},
                    // copys the relative found file "./config.yml" from the integrations folder 
                    // into the mount folder and reachable under "/config.yml" from within the container (here read only)
                    "config.yml": { sourcePath: "./config.yml", internalPath: "/config.yml", type: "ro"}                    
                }
            }
        }
    }

    constructor(CONTEXT) {

    }


    upsertUsers(tenant, data, generated_vars = {}, users){

        // testing
        //console.log(data)
        //console.log("UPSERT USER in HELLO WORLD: ", users)
        
    }

    deleteUsers( enant, data, generated_vars = {}, users ){

        // testing
        //console.log(data)
        //console.log("DELETE USER in HELLO WORLD: ", users)

    }

    updatePermissions( enant, data, generated_vars = {}, users){
        
        // testing
        //console.log(data)
        //console.log("UPDATE PERMISSIONS in HELLO WORLD: ", users)
        
    }


}

