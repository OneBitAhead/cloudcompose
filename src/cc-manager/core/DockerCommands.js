

module.exports = class Docker {

    // socket connection to admin-ui
    #con;
    #docker;


    constructor(CONTEXT) {

        this.#con = CONTEXT.con;
        this.#docker = CONTEXT.docker;
        this.#registerTopics();

    }


    #registerTopics() {
        // Stats
        this.#con.registerTopic("docker:stats",{scope: this, fn: async (tenant, cmd, payload) => { 
            // stats is called without tenant scope and will be check for the correct container 
            // in every tenant for its own!
            return this.#docker.stats() 
        }});
        // project (docker compose up/down/stop)          
        this.#con.registerTopic("docker:project", {scope: this, fn: async (tenant, cmd, payload) => {
            if (cmd === "create") {
                try{
                    var a = await this.#docker.createProject(tenant, payload.full_tech_name, payload.uuid, payload.local_app_passwords);                    
                    return a;
                }catch(e){
                    log.error("Docker", e, "Error in create project")                    
                    return {error: e.toString()};
                }
            }        
            else if (cmd === "start") return await this.#docker.startProject(tenant, payload.project);
            else if (cmd === "stop") return await this.#docker.stopProject(tenant, payload.project);
            else if (cmd === "delete") return await this.#docker.deleteProject(tenant, payload.project);
            else if (cmd === "postinstall") return await this.#docker.runPostinstall(tenant, payload.appIdentifier, payload.integrationData);     
            else if (cmd === "setLimit") return await this.#docker.setLimit(tenant, payload.project, payload.containerName, payload.values); 
            else if (cmd === "getState") return await this.#docker.getState(tenant, payload.project);     
            return { error: `Command for topic 'docker:project' unknown: ${cmd}` }
        }});

    }

}


