

module.exports = class Haproxy {

    // socket connection to admin-ui
    #con;
    #haproxy;

    constructor(CONTEXT) {

        this.#con = CONTEXT.con;
        this.#haproxy = CONTEXT.Haproxy;
        this.#registerTopics();
    }


    #registerTopics() {
             

        
        // project (docker compose up/down/stop)          
        this.#con.registerTopic("haproxy", {scope: this, fn: async (tenant, cmd, payload) => {


            if (cmd === "addCert") return await this.#haproxy.addCert(payload);
            if (cmd === "deleteCert") return await this.#haproxy.deleteCert(payload);
            return { error: `Command for topic 'apps' unknown: ${cmd}` }
        }});

    }

}


