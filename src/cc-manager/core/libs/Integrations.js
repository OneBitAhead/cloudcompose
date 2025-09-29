const fsp = require("node:fs/promises");
const path = require("node:path");

module.exports = class Integrations {

    #CONTEXT;
    #integrations;
    #integrationsFolder;
    #LOCALES;


    constructor(CONTEXT) {

        this.#CONTEXT = CONTEXT;
        this.#LOCALES = {};                
    }

    async #fileExists(path) {
        try {
            await fsp.access(path);
            return true;  // File exists
        } catch (e) {
            return false; // File does not exist or no access
        }
    }


    async init(){

        this.#integrations = {};

        await this.initAvailableIntegrations("/cc/integrations");
        await this.initAvailableIntegrations(process.env.F_custom_integrations);
        
        log.debug("Integration",Object.keys(this.#integrations), `Loaded integrations`);

    }

    async initAvailableIntegrations(baseFolder) {

       
        var folders = await fsp.readdir(baseFolder);
        for (var x in folders) {
            var stats = await fsp.stat(path.join(baseFolder, folders[x]));
            if (stats.isDirectory()) {
                // check for index file           
                if (await this.#fileExists(path.join(baseFolder, folders[x], "index.js")) === true) {
                    this.#register(baseFolder, folders[x], path.join(baseFolder, folders[x], "index.js"))
                } else if (await this.#fileExists(path.join(baseFolder, folders[x], "index.mjs")) === true) {
                    this.#register(baseFolder, folders[x], path.join(baseFolder, folders[x], "index.mjs"))
                }

            }
        }

     

    }

    async #register(baseFolder, folder, indexFile) {

        var parts = folder.split("__");
        var app = null;

        try {
            var integration = new (require(indexFile).default)(this.#CONTEXT);
            // compare file name with tech_name and version in the config!
            var config = integration.config;
            if (parts[0] !== config.tech_name) log.error("Integrations", `Tech name in folder '${parts[0]}' differs from tech_name (${config.tech_name}) in config in '${indexFile}'!!`);
            if (parts[1] !== config.version) log.error("Integrations", `Version in folder '${parts[1]}' differs from version (${config.version}) in config in '${indexFile}'!!`);

            // NO LONGER APP NAME THEN 30 characters (docker container names: cc-app-<tenantId>-<appName>-(exposedPort))!!
            if(config.tech_name.length > 30) {
                log.error("Integrations", `Tech name is longer than 30 characters (docker container names could get too long. (${config.version}) in config in '${indexFile}'!!`);
                return false;
            }

            app = `${config.tech_name}:${config.version || "latest"}`;

            // Syntax checks
            // at least one port that is exposed in the containers?
            // NO subdomain in the app config anymore!
            var containers = integration.getContainers({id: "dummyId", baseDomain: "cc.dummy.de"},{},{});
            var hasOneSubdomainPort = false;

            for (var x in containers) {
                let c = containers[x];
                for (var y in c.ports) {
                    if (isNaN(y)) log.error("Integrations", `[${app}] Ports key needs to be an integer: ${x}, ${y}, ${c.ports[y]}`);
                    if (c.ports[y].subdomain !== undefined) hasOneSubdomainPort = true;
                }
            }
            if (hasOneSubdomainPort === false) log.error("Integrations", `[${app}] No subdomain configured in ports in any container?`);
            if (config.subdomain !== undefined) log.error("Integrations", `[${app}] Please remove 'subdomain' from config of integration (subdomains are registered in container - ports!)`);

            this.#integrations[app] = integration;
            // add basePath
            this.#integrations[app].basePath = path.join(baseFolder, folder);
            log.debug("Integrations", `Registered: ${app}`);


        } catch (e) {
            log.error("Integrations", `[${folder}] ${e.toString()}`);
            return false;
        }

        try {
            // Load locales of the app
            this.#LOCALES[folder] = require(path.join(baseFolder, folder, "locale.json"));

        } catch (e) {
            log.warn("Integrations", `No locale file for ${app}`);
        }
        // check if the app is stored in admin-ui database!

    }


    /**
     * List available integrations (with data returns ALL config, containers...)
     * 
     */
    list(withData) {

        if (!withData) return Object.keys(this.#integrations)
        else {
            // collect ALL data (config, containers) per app
            var data = {};
            for (var x in this.#integrations) {

                let config = this.#integrations[x].config;
                config.has_upsert_user_logic = (typeof this.#integrations[x].upsertUsers === "function") ? true: false;
                
                data[x] = {
                    config: config                    
                }
            }
            return data;
        }
    }


    

     #getVar(options = {}){

        if(options.uuid) return randomUUID();        
        if(typeof options === "string" || typeof options === "number") return options;

        // Generate a variable
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const specials = (options.specialChars !== undefined && typeof options.specialChars === "string") ? options.specialChars: "!@#$%^&*()_-+=[]{};:,.<>?";
        const allChars = chars + specials;
        let password = "";
        
        var length = options.length || 15;        
        
        for (let i = 0; i < length; i++) {
            const randIndex = Math.floor(Math.random() * allChars.length);
            password += allChars[randIndex];
        }

        return password;

    }



    getInfo(tenant, appIdentifier, local_app_passwords) {

        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration for '${appIdentifier}'`);
            return false;
        }

        var result = this.#integrations[appIdentifier].config;
         if(typeof this.#integrations[appIdentifier].generatedVars === "function"){

            var toGenerate = this.#integrations[appIdentifier].generatedVars(tenant);              
            // Ceate variables?
            result.generated_vars = {};        
            for(var x in toGenerate){
                result.generated_vars[x] = this.#getVar(toGenerate[x]);
            }
        }
        result.containers = this.#integrations[appIdentifier].getContainers(tenant, result.generated_vars, local_app_passwords);
        // add base path
        result.basePath = this.#integrations[appIdentifier].basePath;
        
        return result;

    }


    hasCustomInstall(appIdentifier) {

        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].custominstall !== "function") {
            log.debug("Integrations", `No custominstall function in integration for '${appIdentifier}'`);
            return false;
        }

        return true;
    }

    async runCustomInstall(tenant, appIdentifier, data) {


         if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].custominstall !== "function") {
            log.debug("Integrations", `No custominstall function in integration for '${appIdentifier}'`);
            return false;
        }
        try {
            var i = this.#integrations[appIdentifier];
            var result = await i.custominstall(tenant, data);
            return result;

        } catch (e) {
            log.error("Integrations", e);
            return { error: e.toString() }
        }

    }



    hasPostinstall(appIdentifier) {

        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].postinstall !== "function") {
            log.debug("Integrations", `No postinstall function in integration for '${appIdentifier}'`);
            return false;
        }

        return true;
    }

    hasUpsertUsersLogic(appIdentifier){

         if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].upsertUser !== "function") {
            log.debug("Integrations", `No upsertUser function in integration for '${appIdentifier}'`);
            return false;
        }

        return true;
    }


    getAppLocales() {
        return this.#LOCALES;
    }


    async runPostinstall(tenant, appIdentifier, data) {


        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].postinstall !== "function") {
            log.debug("Integrations", `No postinstall function in integration for '${appIdentifier}'`);
            return false;
        }
        try {
            var i = this.#integrations[appIdentifier];
            var result = await i.postinstall(tenant, data);
            return result;

        } catch (e) {
            log.error("Integrations", e);
            return { error: e.toString() }
        }

    }


    async upsertUsers(tenant, appIdentifier, data, generated_vars, users) {


        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].upsertUsers !== "function") {
            log.debug("Integrations", `No upsertUsers function in integration for '${appIdentifier}'`);
            return false;
        }
        try {
            var i = this.#integrations[appIdentifier];
            var result = await i.upsertUsers(tenant, data, generated_vars, users);
            return result;

        } catch (e) {
            log.error("Integrations", e);
            return { error: e.toString() }
        }



    }

    async deleteUsers(tenant, appIdentifier, data, generated_vars, users) {

        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].deleteUsers !== "function") {
            log.debug("Integrations", `No deleteUsers function in integration for '${appIdentifier}'`);
            return false;
        }
        try {
            var i = this.#integrations[appIdentifier];
            var result = await i.deleteUsers(tenant, data, generated_vars,users);
            return result;

        } catch (e) {
            log.error("Integrations", e);
            return { error: e.toString() }
        }
    }


    async updatePermissions(tenant, appIdentifier, data, generated_vars, users) {

        if (!this.#integrations[appIdentifier]) {
            log.debug("Integrations", `No integration script for '${appIdentifier}'`);
            return false;
        }
        if (typeof this.#integrations[appIdentifier].updatePermissions !== "function") {
            log.debug("Integrations", `No updatePermissions function in integration for '${appIdentifier}'`);
            return false;
        }
        try {
            var i = this.#integrations[appIdentifier];
            var result = await i.updatePermissions(tenant, data, generated_vars, users);
            return result;

        } catch (e) {
            log.error("Integrations", e);
            return { error: e.toString() }
        }
    }

}