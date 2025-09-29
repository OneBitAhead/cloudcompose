

module.exports = class Apps {

    // socket connection to admin-ui
    #con;
    #integrations;


    constructor(CONTEXT) {

        this.#con = CONTEXT.con;
        this.#integrations = CONTEXT.Integrations
        this.#registerTopics();
    }


    #registerTopics() {
             
        // project (docker compose up/down/stop)          
        this.#con.registerTopic("apps", {scope: this, fn: async (tenant, cmd, payload) => {

            if (cmd === "list") return await this.#integrations.list(payload.withData);
            if (cmd === "locales") return await this.#integrations.getAppLocales();
            if (cmd === "upsertUsers") return await this.#integrations.upsertUsers(tenant, payload.appIdentifier, payload.integrationData, payload.generated_vars, payload.users);
            if (cmd === "deleteUsers") return await this.#integrations.deleteUsers(tenant, payload.appIdentifier, payload.integrationData, payload.generated_vars, payload.users);
            if (cmd === "updatePermissions") return await this.#integrations.updatePermissions(tenant, payload.appIdentifier, payload.integrationData, payload.generated_vars, payload.users);
            return { error: `Command for topic 'apps' unknown: ${cmd}` }
        }});

    }

}


