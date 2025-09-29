


module.exports = class Keycloak {

    #con;
    #adminEmail;    

    constructor(CONTEXT, options){

        options = options || {};
        this.#con = CONTEXT.con;
        this.#adminEmail = options.userEmail || `${process.env.TECH_ADMIN_NAME}@${process.env.BASE_DOMAIN}`;

        this.#registerTopics();

    }
    
    #registerTopics() {
        // Users
        this.#con.registerTopic("kc:users", {scope: this, fn: async (tenant, cmd, payload) => {
            log.debug("Socket", `Call 'kc:users': ${cmd}`);
            if (cmd === "sync") return await this.syncUserToKeyCloak(tenant, payload.action, payload.user, payload.changes);             
            if (cmd === "changePassword") return await tenant.keycloak.changeUserPassword(payload.email, payload.password, payload.temporary = false);
            return { error: `Command for topic 'kc:users' unknown: ${cmd}` }
        }});
        // Clients
        this.#con.registerTopic("kc:clients", {scope: this, fn: async (tenant, cmd, payload) => {            
            log.debug("Socket", `Call 'kc:clients': ${cmd}`);
            if (cmd === "add") return await this.addClient(tenant, payload.clientId, payload.subdomains);    
            else if (cmd === "delete") return await this.deleteClient(tenant, payload.clientId); 
            else if (cmd === "client-roles") return await this.getUserRoles(tenant, payload.clientId, payload.email);  
            else if (cmd === "sync") return await this.syncAllClients(tenant, payload.clientIds);                                  
            return { error: `Command for topic 'kc:clients' unknown: ${cmd}` }
        }});
        // Permissions (role-mapping); [working]
        this.#con.registerTopic("kc:permissions", {scope: this, fn: async (tenant, cmd, payload) => {
            log.debug("Socket", `Call 'kc:permissions': ${cmd}`);
            if (cmd === "sync") return await this.syncUserPermission(tenant, payload.action, payload.clientId, payload.email, payload.role);    
            return { error: `Command for topic 'kc:permissions' unknown: ${cmd}` }
        }});

    }



    async getUserRoles(tenant, clientId, email){

        var result = await tenant.keycloak.getUserRolesByEmail(clientId, email);
        var roles = [];
        for(var x in result){
            roles.push(result[x].name)
        }    

        return roles;
    }


    async syncAllClients(tenant, clientIds){
        
        var result = {
            deleted: [],
            ok: []
        }

        // get all app clients (cc-app-)
        // of the keycloak instance
        var clients = await tenant.keycloak.listClients("cc-app-");
        for(var x in clients){
            let id = clients[x].id;
            let clientId = clients[x].clientId;        
            if(clientIds.indexOf(clientId)===-1) {
                result.deleted.push(clientId);
                await tenant.keycloak.deleteClient(clientId);
            } else {
                result.ok.push(clientId);
            }
        }

        

        return result;
    }


    
    async syncUserToKeyCloak(tenant, action, user, changes){
        
        // no changes for protecedt tech_admin
        if(user.email === this.#adminEmail){
            return {error: "NO CHANGE OF TECH_ADMIN!"};
        }     

        if(action === "delete"){   

           return await tenant.keycloak.deleteUser(user.email);

        } else if(action === "insert"){

            var result = await tenant.keycloak.upsertUser({
                // identifier
                email: user.email,
                // changed data
                firstname: user.firstname, 
                lastname: user.lastname
            })   
            log.debug("Keycloak", result, `Result of adding user ${user.email}`);        

            // initial role oif cc-admin-ui (app)
            if(user.role === "user"){
                var roleResult = await tenant.keycloak.addClientRoleToUser("cc-admin-ui", user.email, "user"); 
            } else if(user.role === "admin"){
                var roleResult = await tenant.keycloak.addClientRoleToUser("cc-admin-ui", user.email, "admin"); 
            }            
            log.debug("Keycloak", `Result of adding role ${user.role} to user ${user.email}: ${roleResult}`);            

            return {user: result, role: roleResult};

        } else if(action === "update"){
            
            if(changes && (changes.firstname !== undefined || changes.lastname !== undefined)){
                var result = await tenant.keycloak.upsertUser({
                    // identifier
                    email: user.email,
                    // changed data
                    firstname: user.firstname, 
                    lastname: user.lastname
                })
               
            }
            if(changes && changes.role !== undefined){
                // change role
                var role = changes.role;
                if(role === "admin"){
                    await tenant.keycloak.deleteClientRoleOfUser("cc-admin-ui", user.email, "user");
                    await tenant.keycloak.addClientRoleToUser("cc-admin-ui", user.email, "admin");                    
                } else if (role === "user"){
                    await tenant.keycloak.deleteClientRoleOfUser("cc-admin-ui", user.email, "admin");
                    await tenant.keycloak.addClientRoleToUser("cc-admin-ui", user.email, "user");                    
                }               
            }

            return result;
        }
            
    }


    async addClient(tenant, clientId, subdomains){

        var mainSubdomain = subdomains[0];
        var redirectURIs = [];
        var webOrigins = [];
        for(var x in subdomains){
            redirectURIs.push(`https://${subdomains[x]}-${tenant.id}.cloudcompose.de/*`);
            webOrigins.push(`https://${subdomains[x]}-${tenant.id}.cloudcompose.de`);
        }
                
        // Add client
        var client = await tenant.keycloak.upsertClient(clientId, {
            baseUrl: `https://${mainSubdomain}-${tenant.id}.cloudcompose.de`,
            rootUrl: `https://${mainSubdomain}-${tenant.id}.cloudcompose.de`,
            adminUrl: `https://${mainSubdomain}-${tenant.id}.cloudcompose.de`,
            webOrigins: webOrigins,
            redirectURIs: redirectURIs,
            // set secret
            // secret: CLIENT_SECRET,
            clientAuthenticatorType: "client-secret",
            // set default roles
            roles:[{name: "admin", description: ''},{"name":"user","description": ""}]
        });
   

        return client;

    }


    async deleteClient(tenant, clientId){
        return await tenant.keycloak.deleteClient(clientId);
    }




    async syncUserPermission(tenant, action,clientId, email, role){

        if(action === "insert"){            
            return await tenant.keycloak.addClientRoleToUser(clientId, email, role);
        } else if (action === "delete"){
            if(!role) return await tenant.keycloak.deleteClientRolesOfUser(clientId, email);
            else return await tenant.keycloak.deleteClientRoleOfUser(clientId, email, role);
        }
    }

}