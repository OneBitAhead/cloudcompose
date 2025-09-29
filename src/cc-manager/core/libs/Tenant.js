const Keycloak = require("./Keycloak.js");


module.exports = class Tenant {

    #id;
    #config;
    #keycloak;
    #CONTEXT;
    #USE_KEYCLOAK;

    #baseDomain;

    
    constructor(tenantId, config, useKeycloak) {
        
        this.#id = tenantId;
        this.#config = config;  
        this.#baseDomain = config.baseDomain;
        this.#USE_KEYCLOAK = useKeycloak;
        this.#init();
    }    
    get id (){
        return this.#id;
    }
    get baseDomain(){
        return this.#baseDomain;
    }
    get keycloak(){
        return this.#keycloak;
    }
       
    async #init(){
        
        // init keycloak connection
        if(this.#USE_KEYCLOAK){
            this.#keycloak = new Keycloak(this, this.#config.keycloak, this.#CONTEXT);
            await this.#keycloak.init();
        }
        

    }  

}






