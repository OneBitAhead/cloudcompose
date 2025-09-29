module.exports = function init(CONTEXT){

    var app = CONTEXT.app;
    
  
    app.get('/api/permissionBase', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {        
        // get users
        var users = await req.tenant.db.table("users").fetch(req, {}, {attributes:["id", "role", "username", "email"]});
        // get apps
        var apps = await req.tenant.db.table("apps").fetch(req, {}, {attributes:["app_name","tech_name","install_status","app_blueprint.roles","app_blueprint.default_auth_method"], withRelations: true})        
        // Filter out blueprints with NONE as auth method :)
        apps = apps.filter((app)=>{
            if(app.app_blueprint.default_auth_method === "none") return false;
            return true;
        })
        // get orders
        var orders = await req.tenant.db.table("orders").fetch(req, {}, {attributes:["app_blueprint", "creation_date", "cancellation_date", "product.number_of_users"], withRelations: true});

        // mix orders into apps
         for(var x in apps){
            let a = apps[x];
            a.orders = orders.filter( o => o.app_blueprint = a.app_blueprint.id)
        }
        res.status(200).json({ users, apps });    

    });

    app.get('/api/permissions', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {        
        // get permissions
        var permissions = await req.tenant.db.table("permissions").fetch();
        res.status(200).json(permissions);             
    });

    // ADD PERMISSION
    app.post('/api/permissions', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {
        var userId = parseInt(req.body.user,10);
        var appId  = parseInt(req.body.app,10);           
        var role = req.body.role || null;     
        // upsert
        try{
            var result = await req.tenant.db.table("permissions").upsert({}, {user: userId, app: appId, role});

            // send a message to the proxy to remove from PermissionCache!
            CONTEXT.functions.deleteAppPermissionsOfUser(req.tenant, appId, userId);
            // also reset the internal permissions (waits 2 seconds...)
            req.tenant.refreshUserPermissions(userId);
            

        }catch(e){
            return res.status(400).json({error: (e.toJSON) ? e.toJSON(): e.toString()})
        }
        res.status(200).json(result);              
    });

    // DELETE PERMISSION
     app.delete('/api/permissions', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {
        var userId = parseInt(req.body.user,10);
        var appId  = parseInt(req.body.app,10);                
        // delete 
        try{
            var result = await req.tenant.db.table("permissions").deleteWhere({}, {user: userId, app: appId},{eventWithDeletedData: true});

            // send a message to the proxy to remove from PermissionCache!
            CONTEXT.functions.deleteAppPermissionsOfUser(req.tenant, appId, userId);
            // also reset the internal permissions (waits 2 seconds...)
            req.tenant.refreshUserPermissions(userId);            

        }catch(e){         
            return res.status(400).json({error: (e.toJSON) ? e.toJSON(): e.toString()})
        }
        res.status(200).json(result);                      

    });

    
};
