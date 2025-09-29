const randomUUID = require("node:crypto").randomUUID;




module.exports = function init(CONTEXT) {

    var app = CONTEXT.app;

    // Apps of a user
    app.get('/api/instances/appsOfUser', async (req, res) => {

        var userPermissions = await req.tenant.getUserPermissions(req.user.id);

        try {
            // Ask for stats
            var stats = await CONTEXT.functions.getStats(req.tenant, { withBlueprintData: true });
            for (var x in stats.apps) {
                let project = stats.apps[x].project;
                // remove container detail!
                // delete stats.apps[x].containers;
                if (userPermissions[project] !== undefined) stats.apps[x].hasPermission = true;
                else stats.apps[x].hasPermission = false;
            }
            res.status(200).json(stats.apps);
        } catch (e) {
            log.error("App", e);
            res.status(400).json({ error: e.toString() });
        }
    });

    // Stats for the running apps
    app.get('/api/instances/stats', async (req, res) => {
        try {
            // Ask for stats
            var stats = await CONTEXT.functions.getStats(req.tenant);
            res.status(200).json(stats);
        } catch (e) {
            log.error("App", e);
            res.status(400).json({ error: e.toString() });
        }

    });


    //##############################
    //### Create an app
    //##############################

    // Register queue function
    CONTEXT.registerJobFunction({
        cmd: "app-create",
        scope: this,
        // checked with "cmd" and vars from payload provided here (e.g. "id")
        uniqueness: ["id"],
        // on enqueue the context is fetched...
        getContext: async (tenant, payload) => {

            var id = payload.id;
            var result = await tenant.db.table("app_blueprints").fetchById({}, id);
            var appData = result[0];

            var uuid = randomUUID();
            var installSteps = CONTEXT.functions.getInstallSteps(tenant, appData);

            var data = {
                uuid: uuid,
                app_blueprint: id,
                // from blueprint
                app_name: appData.name,
                tech_name: appData.tech_name,
                external_service: appData.external_service,
                start_url: appData.start_url,
                // for automatic firewall settings!
                fw_types: appData.fw_types,
                allow_from_fw_type: appData.allow_from_fw_type,
                //--------------------------
                version: appData.version,
                install_status: "waiting",
                install_steps: installSteps
            };

            // Create App instance
            var result = await tenant.db.table("apps").insert({}, data);
            var appId = result[0];

            try {

                if (payload && payload.options && payload.options.product) {

                    // Create Order
                    var productResult = await tenant.db.table("products").fetch({}, { identifier: payload.options.product });

                    if (productResult && productResult.length === 1) {
                        var product = productResult[0];

                        const creation_date = new Date();

                        const orderData = {
                            'product': product.id,
                            'app_blueprint': appData.id,
                            'creation_date': creation_date.getTime(),
                            'cancellation_date': null,

                        }
                        var result = await tenant.db.table("orders").insert({}, orderData);
                        var orderId = result[0];


                        // Create initial invoice
                        const invoiceData = {
                            'identifier': randomUUID(),
                            'date': creation_date.getTime(),
                            'description': appData.name + '/' + creation_date.toLocaleDateString(),
                            'order': orderId,
                            'paid': false
                        }
                        var result = await tenant.db.table("invoices").insert({}, invoiceData);

                    }

                }


            } catch (e) {
                throw new Error("Not installed correctly:" + e.toString())
            }


            var context = {
                id: id,
                name: appData.name,
                tech_name: appData.tech_name,
                multi_instance: appData.multi_instance,
                // instance data
                appId: appId,
                uuid: uuid,
                installSteps: installSteps
            }
            return context;

        },

        onRun: async (tenant, job, payload, context, sendStatus) => {
            return await CONTEXT.functions.runInstall(tenant, job, payload, context, sendStatus);
        }//end-of-onRun            

    });


    app.post('/api/instances/create/:id', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        var id = req.params.id;
        const options = req.body.options;
        var job = await req.tenant.queue.enqueue("app-create", { id: id, options: options });
        res.status(200).json(job);

    });



    //##############################
    //### Run the postinstall (new job)
    //##############################

    // Register queue function
    CONTEXT.registerJobFunction({
        cmd: "app-create-postinstall",
        scope: this,
        // checked with "cmd" and vars from payload provided here (e.g. "id")
        uniqueness: ["id"],
        getContext: async (tenant, payload) => {

            var result = await tenant.db.table("apps").fetchById({}, payload.appId);
            var app = result[0];
    
            var blueprints = await tenant.db.table("app_blueprints").fetchById({}, app.app_blueprint);
            var blueprintData = blueprints[0];
                        
            var installSteps = CONTEXT.functions.getInstallSteps(tenant, blueprintData);
            // only postinstall steps!
            installSteps = installSteps.filter((step)=>{
                if(step.type === "postinstall") return true;
                else return false;
            })
            
            return context = {
                id: app.id,
                name: app.app_name,
                installSteps: installSteps                
            }
        },
        onRun: async (tenant, job, payload, context, sendStatus) => {
            return await CONTEXT.functions.runPostinstall(tenant, payload.appId, sendStatus)
            
        }//end-of-onRun            

    });


    app.get('/api/instances/postinstall/:appId/steps', CONTEXT.middleware.needsRole("admin"), async (req, res) => {


        var result = await req.tenant.db.table("apps").fetchById({}, req.params.appId);
        var app = result[0];
        var blueprints = await req.tenant.db.table("app_blueprints").fetchById({}, app.app_blueprint);
        var blueprintData = blueprints[0];                    
        var installSteps = CONTEXT.functions.getInstallSteps(req.tenant, blueprintData);
        // only postinstall steps!
        installSteps = installSteps.filter((step)=>{
            if(step.type === "postinstall") return true;
            else return false;
        })

        res.status(200).json({installSteps: installSteps});

    });


    app.put('/api/instances/postinstall/:appId', CONTEXT.middleware.needsRole("admin"), async (req, res) => {
        
        var appId = req.params.appId; 
        // check the install status (and needed steps)
        var result = await req.tenant.db.table("apps").fetchById({}, appId, { attributes: ["*", "app_blueprint.roles"], withRelations: true });
        var app = result[0];
        if (!app) return res.status(400).json({ error: "No such app" });

        var job = await req.tenant.queue.enqueue("app-create-postinstall", { appId: appId });
        res.status(200).json(job);

    });



    async function getBlueprintContextForApp(tenant, appId) {

        var appQuery = await tenant.db.table("apps").fetch({}, { id: appId });
        var app = appQuery[0];
     
        var result = await tenant.db.table("app_blueprints").fetchById({}, app.app_blueprint);
        var appData = result[0];

        var context = {
            id: appId,
            project: app.project,
            name: appData.name,
            tech_name: appData.tech_name,
            multi_instance: appData.multi_instance,
            // instance data
            appId: app.id
        }

        return context;

    }


    //##############################
    //### Start an app
    //##############################
    CONTEXT.registerJobFunction({
        cmd: "app-start",
        scope: this,
        // checked with "cmd" and vars from payload provided here (e.g. "project")
        uniqueness: ["appId"],
        // on enqueue the context is fetched...
        getContext: async (tenant, payload) => {
            return await getBlueprintContextForApp(tenant, payload.appId);
        },
        // run
        onRun: async (tenant, job, payload, context, sendStatus) => {

            var project = context.project;
            var result = await CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:project", cmd: "start", payload: { project: project } });
            // add client to keycloak!!!
            CONTEXT.functions.addKeycloakClient(tenant, project);
            // refresh mapping to proxy-server
            CONTEXT.functions.refreshAppProxyMapping(tenant, "add", project);
            return result;

        }
    });
    app.put('/api/instances/start/:appId', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        var appId = req.params.appId;

        //When project is not initialized correctly
        if (appId === 'null') {
            return res.status(404).json({ error: 'App "null" cannot be found' });
        }

        var job = await req.tenant.queue.enqueue("app-start", { appId: appId });
        res.status(200).json(job);

    });



    //##############################
    //### Stop an app
    //##############################

    CONTEXT.registerJobFunction({
        cmd: "app-stop",
        scope: this,
        // checked with "cmd" and vars from payload provided here (e.g. "project")
        uniqueness: ["appId"],
        // on enqueue the context is fetched...
        getContext: async (tenant, payload) => {
            return await getBlueprintContextForApp(tenant, payload.appId);
        },
        // run
        onRun: async (tenant, job, payload, context, sendStatus) => {

            var project = context.project;
            var result = await CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:project", cmd: "stop", payload: { project: project } });
            // refresh mapping to proxy-server
            CONTEXT.functions.refreshAppProxyMapping(tenant, "remove", project);
            return result;

        }
    });

    app.put('/api/instances/stop/:appId', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        var appId = req.params.appId;
        
        //When project is not initialized correctly
        if (appId === 'null') {
            return res.status(404).json({ error: 'App "null" cannot be found' });
        }

        var job = await req.tenant.queue.enqueue("app-stop", { appId: appId });
        res.status(200).json(job);
    });

    //##############################
    //### Delete an app
    //##############################

    CONTEXT.registerJobFunction({
        cmd: "app-delete",
        scope: this,
        uniqueness: ["appId"],
        // on enqueue the context is fetched...
        getContext: async (tenant, payload) => {           
            return await getBlueprintContextForApp(tenant, payload.appId);
        },
        // run        
        onRun: async (tenant, job, payload, context, sendStatus) => {

            var project = context.project;
            var force = payload.force;

            

            if(project){
                try{
                    var result = await CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "docker:project", cmd: "delete", payload: { project: project, force: force } });
                }catch(e){
                    if(force !== true) {
                        log.error("Instances", e, `Error deleting project: ${project}`)
                        throw e;
                    }
                }
            } else {
                log.info("Instances", "No project to delete")
            }        

            // Fetch the app data THEN delete it (so the refresh event (e.g. in the browser) will NOT see the app anymore)
            var records = await tenant.db.table("apps").fetch({}, { id: payload.appId });
            if (records.length !== 1) return false;
            app = records[0];            

            // First delete it
            await tenant.db.table("apps").deleteWhere({}, { id: payload.appId }, { ignoreEvents: true, ignoreHooks: true });
            // Delete app_passwords too!
            await tenant.db.table("app_passwords").deleteWhere({}, {app: app.id }, { ignoreEvents: true, ignoreHooks: true }); 

            // delete app permissions (move to delete!!!!!!)
            await CONTEXT.functions.deleteAppPermissions(tenant, app.id);

            // refresh mapping to proxy-server
            await CONTEXT.functions.refreshAppProxyMapping(tenant, "destroy", project, app);
            // remove client to keycloak!!!
            await CONTEXT.functions.deleteKeycloakClient(tenant, project);

            return result;

        }
    });

    app.delete('/api/instances/delete/:appId', CONTEXT.middleware.needsRole("admin"), async (req, res) => {        
        var appId = req.params.appId;
        var force = (req.query.force === 'true') ? true: false;        
        var job = await req.tenant.queue.enqueue("app-delete", { appId: appId, force: force });
        res.status(200).json(job);
    });












};
