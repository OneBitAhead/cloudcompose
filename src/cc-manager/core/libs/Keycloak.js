


module.exports = class Keycloak {


    #tenant;
    #BASE_SUBDOMAIN;
    #KEYCLOAK_URL;
    #adminUser;
    #adminPass;
    #token;
    #realm;

    constructor(tenant, options = {}) {

        this.#tenant = tenant;

        console.log(options);
        
        // KEYCLOAK DATA
        this.#realm = options.realm
        this.#BASE_SUBDOMAIN = options.realm;        
        this.#KEYCLOAK_URL = `https://${process.env.KC_DOMAIN || 'identity.cloudcompose.de'}`;
                
        this.#adminUser = options.user || "tech_admin";
        this.#adminPass = options.pass || options.techAdminPwd;

        // if this class is directly called (e.g. install script)
        // include the logging and show only errors :)
        if (globalThis.log === undefined) require("../libs/Logging")("error");

        log.debug("Keycloak", '\x1b[34m%s\x1b[0m', '----------------------------------');
        log.debug("Keycloak", '\x1b[34m%s\x1b[0m', 'KEYCLOACK SETUP');
        log.debug("Keycloak", `- BASE_SUBDOMAIN: ${this.#BASE_SUBDOMAIN}`)
        log.debug("Keycloak", `- REALM: ${this.#realm}`)
        log.debug("Keycloak", `- ADMIN_USER: ${this.#adminUser}`)
        log.debug("Keycloak", '\x1b[34m%s\x1b[0m', '----------------------------------');

    }

    async init() {

        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', 'admin-cli');
        params.append('username', this.#adminUser);
        params.append('password', this.#adminPass);

        console.log(params);
        
        // init always against the master-realm
        let url = `${this.#KEYCLOAK_URL}/realms/${this.#BASE_SUBDOMAIN}/protocol/openid-connect/token`;
        var result = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            body: params
        });
       
        if (result.status === 200) {
            var data = await result.json();
            this.#token = data.access_token;
            log.debug("Keycloak", `Log in ok (${this.#KEYCLOAK_URL})`)
        } else {
            console.log(result.status);
            console.log(await result.json())
            log.error("Keycloak", result);
            throw new Error("NoToken");
        }
    }

    // Wrapper for fetch (if HTTP 401) -> init automatically
    async #fetch(url, options, retry) {
        log.trace("Keycloak", `Fetch wrapper: ${url}`);
        var result = await fetch(url, options);
        if (result.status === 401) {
            if (retry === true) {
                log.error("Keycloak", result, "No login possible (already retried)");
                var body = await result.json();
                throw new Error(JSON.stringify(body));
            }
            log.debug("Keycloak", "Token too old...reconnect...");
            await this.init()
            return await this.#fetch(url, options, true);
        }
        return result;
    }


    async #getRessource(options) {

        var url = '';
        var query = options.query;
        var uuid = options.uuid;

        if (!query && !uuid) {
            log.error("Keycloak", { options }, "#getRessource needs either 'query' or 'uuid'");
            throw new Error("getRessource needs either 'query' or 'uuid'");
        }

        if (query) {
            url = `${this.#KEYCLOAK_URL}${options.baseURL}?${query}`
        } else if (uuid) {
            url = `${this.#KEYCLOAK_URL}${options.baseURL}/${uuid}`
        }

        var request = await this.#fetch(`${url}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            }
        });

        var existing = await request.json();

        if (query) {
            if (existing.length === 1) return existing[0];
            log.trace("Keycloak", request);
            return false;
        } else if (uuid) {
            if (request.status === 404) return false;
            else return existing;
        }

    }

    async #list(options) {

        var result = await this.#fetch(`${this.#KEYCLOAK_URL}${options.url}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            }
        });
        var records = await result.json();
        return records;

    }

    async #get(options) {

        var result = await this.#fetch(`${this.#KEYCLOAK_URL}${options.url}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            }
        });
        var record = await result.json();
        return record;

    }

    async #delete(options) {

        var result = await this.#fetch(`${this.#KEYCLOAK_URL}${options.url}`, {
            method: "DELETE",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            },
            body: JSON.stringify(options.data || {})
        });
        return result;

    }


    /**
     * Create a ressource and return it (handled like an upsert to not get errors all the time :))
     */
    async #upsert(options) {

        log.debug("Keycloak",{options}, "Upsert keycloak:");

        // How to get identity ...
        // either by "query"
        // or "uuid" (e.g. realms!)
        var url = options.url;
        var data = options.data;
        var fetchOptions = {
            baseURL: url
        }

        if (options.queryId) {
            if (data[options.queryId] === undefined) {
                let error = `Attribute '${options.queryId}' needed in data for upsert!`;
                log.error("Keycloak", error);
                throw new Error(error);
            }
            // set fetchOptions
            fetchOptions.query = `${options.queryId}=${data[options.queryId]}`;

        } else if (options.uuid) {
            // set fetchOptions
            fetchOptions.uuid = options.uuid;
        } else {
            log.error("Keycloak", options, `Upsert needs 'queryId' (with data) or 'uuid' to identify a ressource!`);
            throw new Error("Upsert needs 'queryId' (with data) or 'uuid' to identify a ressource!");
        }


        // first try to fetch
        var record = await this.#getRessource(fetchOptions);

        if (record) {

            var updateURL = '';
            if (options.queryId) updateURL = `${this.#KEYCLOAK_URL}${url}/${record.id}`;
            else if (options.uuid) updateURL = `${this.#KEYCLOAK_URL}${url}/${options.uuid}`;

            var request = await this.#fetch(updateURL, {
                method: "PUT",
                headers: {
                    'Authorization': `Bearer ${this.#token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(data)
            });

            console.log(request.status);

            if (request.status !== 204) {

                console.log("Error in upsert:", e);
                log.error("Keycloak", {request}, e.toString());
                log.error("Keycloak", await request.json());
                return false;


            } else {
                // fetch the record (to get the new values)                                
                var record = await this.#getRessource(fetchOptions);
                if (record) return record;

                log.error("Keycloak", result, `Could not fetch record after update:`);
                return false;
            }

        } else {

            var result = await this.#fetch(`${this.#KEYCLOAK_URL}${url}`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${this.#token}`,
                    "content-type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (result.status !== 201) {

                log.error("Keycloak", result);
                log.error("Keycloak", await result.json());
                log.error("Keycloak", data);

                // throw new Error(`[${result.status}] ${result.toString()}`);
            } else {

                var location = result.headers.get("location");
                // get the id 
                var uuid = location.substring(`${this.#KEYCLOAK_URL}${url}`.length);
                var record = await this.#getRessource({ baseURL: url, uuid: uuid });
                if (record) return record;

                return false;
            }
        }

    }


    //+++++++++++++++++++++++++
    // Realms
    //+++++++++++++++++++++++++
    setRealm(name) {
        this.#realm = name;
    }

    async upsertRealm(realmData) {
        var data = {
            "realm": realmData.name,
            "enabled": (realmData.enabled !== undefined) ? realmData.enabled : true,
            "displayName": realmData.displayName || null
        };
        return await this.#upsert({ url: `/admin/realms`, uuid: realmData.name, data: data });
    }

    //+++++++++++++++++++++++++
    // CLIENTS
    //+++++++++++++++++++++++++
    async listClients(startsWith) {
        
        var clients = await this.#list({ url: `/admin/realms/${this.#realm}/clients` });
        if (startsWith) clients = clients.filter(client => client.clientId.startsWith(startsWith));
        return clients;
    }
    async getClientByName(name) {
        return await this.#getRessource({ baseURL: `/admin/realms/${this.#realm}/clients`, query: `clientId=${name}` });
    }

    async upsertClient(clientId, config) {

        config = config || {};
        var body = {
            "clientId": clientId,
            "enabled": true,
            "protocol": "openid-connect",
            "publicClient": false
        }
        if (config.redirectURIs) body.redirectUris = [].concat(config.redirectURIs);
        if (config.rootUrl) body.rootUrl = config.rootUrl;
        if (config.baseUrl) body.baseUrl = config.baseUrl;
        if (config.adminUrl) body.adminUrl = config.adminUrl;
        if (config.webOrigins) body.webOrigins = config.webOrigins;

        if (config.secret) body.secret = config.secret;
        if (config.clientAuthenticatorType) body.clientAuthenticatorType = config.clientAuthenticatorType;

        var client = await this.#upsert({ url: `/admin/realms/${this.#realm}/clients`, queryId: 'clientId', data: body });
        if (client && config.roles) {
            for (var x in config.roles) {
                await this.upsertRole(client.id, config.roles[x]);
            }
        }
        // return the ressource
        return this.#getRessource({ baseURL: `/admin/realms/${this.#realm}/clients`, uuid: client.id });
    }

    async getClientSecret(name) {
        var client = await this.getClientByName(name);
        var record = await this.#get({ url: `/admin/realms/${this.#realm}/clients/${client.id}/client-secret` });
        return record.value;
    }

    async deleteClient(name) {
        var client = await this.getClientByName(name);
        return await this.#delete({ url: `/admin/realms/${this.#realm}/clients/${client.id}` });
    }

    // ROLES
    async upsertRole(clientUUID, role) {
        var body = {
            name: role.name,
            description: role.description
        }
        return await this.#upsert({ url: `/admin/realms/${this.#realm}/clients/${clientUUID}/roles`, uuid: role.name, data: body });
    }

    async getClientRoleByName(clientId, roleName) {
        var client = await this.getClientByName(clientId);
        return await this.#getRessource({ baseURL: `/admin/realms/${this.#realm}/clients/${client.id}/roles`, uuid: roleName });
    }

    async addClientRoleToUser(clientId, email, role) {

        var client = await this.getClientByName(clientId);
        var user = await this.getUserByEmail(email);
        var role = await this.getClientRoleByName(clientId, role);

        var result = await this.#fetch(`${this.#KEYCLOAK_URL}/admin/realms/${this.#realm}/users/${user.id}/role-mappings/clients/${client.id}`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            },
            body: JSON.stringify([{
                id: role.id,
                name: role.name
            }])
        });

        if (result.status === 204) {
            return true;
        } else {
            log.error("Keycloak", result);
            return false;
        }
    }

    async deleteClientRoleOfUser(clientId, email, role) {

        var client = await this.getClientByName(clientId);
        var user = await this.getUserByEmail(email);
        var role = await this.getClientRoleByName(clientId, role);

        var body = [{
            id: role.id,
            name: role.name
        }]

        return await this.#delete({ url: `/admin/realms/${this.#realm}/users/${user.id}/role-mappings/clients/${client.id}`, data: body });

    }

    async deleteClientRolesOfUser(clientId, email) {

        var client = await this.getClientByName(clientId);
        var user = await this.getUserByEmail(email);

        var roles = await this.getUserRolesByEmail(clientId, email);


        for (var x in roles) {
            var body = [{
                id: roles[x].id,
                name: roles[x].name
            }]
            var deletion = await this.#delete({ url: `/admin/realms/${this.#realm}/users/${user.id}/role-mappings/clients/${client.id}`, data: body });
            log.debug("Keycloak", { deletion }, `Delete role '${roles[x].name}' of user ${email}`)
        }

    }


    async deleteRole(clientId, roleName) {
        var client = await this.getClientByName(clientId);
        return await this.#delete({ url: `/admin/realms/${this.#realm}/clients/${client.id}/roles/${roleName}` });

    }

    //+++++++++++++++++++++++++
    // USERS
    //+++++++++++++++++++++++++
    async upsertUser(user) {

        var data = {
            "username": user.username || user.email,
            "email": user.email,
            "firstName": user.firstname || "firstname",
            "lastName": user.lastname || "lastname",
            "enabled": (user.enabled === false) ? false: true,
            "emailVerified": (user.emailVerified === false) ? false: true,
            "credentials": [
                {
                    "type": "password",
                    "value": user.initialPassword || 12345,
                    "temporary": user.resetPwd || false
                }
            ]
        }
        return await this.#upsert({ url: `/admin/realms/${this.#realm}/users`, queryId: 'username', data: data });

    }

    async listUsers() {
        return await this.#list({ url: `/admin/realms/${this.#realm}/users` });
    }


    async changeUserPassword(email, password, temporary){

                     
        var user = await this.getUserByEmail(email);
        var result = await this.#fetch(`${this.#KEYCLOAK_URL}/admin/realms/${this.#realm}/users/${user.id}/reset-password`, {
            method: "PUT",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                "type": "password",
                "temporary": (temporary === true) ? true: false,
                "value": password
            })
        });

        return result;

    }


    async getUserByEmail(email) {

        var result = await this.#fetch(`${this.#KEYCLOAK_URL}/admin/realms/${this.#realm}/users?email=${email}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            }
        });
        var user = await result.json();
        if (user.length === 1) return user[0];
        return false;

    }


    async getUserRolesByEmail(clientId, email) {

        var client = await this.getClientByName(clientId);
        var user = await this.getUserByEmail(email);
        var result = await this.#fetch(`${this.#KEYCLOAK_URL}/admin/realms/${this.#realm}/users/${user.id}/role-mappings/clients/${client.id}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${this.#token}`,
                "content-type": "application/json"
            }
        });
        var roles = await result.json();
        return roles;
    }



    async deleteUser(email) {
        var user = await this.getUserByEmail(email);
        return await this.#delete({ url: `/admin/realms/${this.#realm}/users/${user.id}` });
    }





}