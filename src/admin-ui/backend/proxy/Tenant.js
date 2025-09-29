module.exports = class Tenant {

    #proxyObj;
    #id;
    #baseDomain;
    #keycloakConfig;

    constructor(proxyObj, config){

        this.#proxyObj = proxyObj;
        this.#id = config.tenantId;
        this.#baseDomain = config.baseDomain;
        this.#keycloakConfig = config.keycloakConfig || false;
                
        proxyObj.registerEndpoint(`${this.#id}.${this.#baseDomain}`, {target: "http://localhost:5002", default_auth_method: "built-in" });
        if(!proxyObj.getEndpoint("localhost")){
          // add the localhost...for after the install!
          proxyObj.registerEndpoint(`localhost`, {defaultTenant: this.#id, target: "http://localhost:5002", default_auth_method: "built-in" });
        }
            

    }

    get id(){
        return this.#id
    }
    get baseDomain(){
        return this.#baseDomain;
    }

    get useKeycloak(){
        return this.#keycloakConfig;
    }

    
    async getUser(email){
        // fetch user from subprocess (the tenants there all havew the correct database connected!)
        var user = await this.#proxyObj.sendToProcess("AdminUI", { tenantId: this.#id, topic: "users", cmd: "get", payload: { email: email}});
        return user;
    }
    
}