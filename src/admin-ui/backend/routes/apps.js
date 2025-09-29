module.exports = function init(CONTEXT){

    var app = CONTEXT.app;

    // Blueprints
    app.get('/api/app_blueprints', CONTEXT.middleware.needsAnyRole("*"),  async(req, res) => {

        // Valid certificate?
        var hostname = req.query.hostname;
        var parts = hostname.split(".");
        var wildcardCert = `*.${parts.slice(1).join('.')}`
        var valid_certificate = false;
        var certificates = await req.tenant.db.table("certificates").fetch({},{},{attributes:["domains"]});
        for(var x in certificates){
            let cert = certificates[x];
            if(cert.domains.indexOf(wildcardCert) !== -1) valid_certificate = true;
        }


        var records = await req.tenant.db.table("app_blueprints").fetch();
        // check installed apps (to mark the installed ones)
        var apps = {};
        var app_instances = await req.tenant.db.table("apps").fetch({},{},{attributes:["id","tech_name","install_status"]});
        var products = await req.tenant.db.table("products").fetch({},{},{attributes:["identifier","app_tech_name", "billing_period", "number_of_users", "price", "price_per_unit","description"]});

        for(var x in app_instances){
            let app = app_instances[x];
            if(!apps[app.tech_name]) apps[app.tech_name] = {count:0};
            apps[app.tech_name].count++;
            if(apps[app.tech_name].install_status && app.install_status !== "success") apps[app.tech_name].install_status = app.install_status;
            else apps[app.tech_name].install_status = app.install_status;
        }
        for(var x in records){
            let r = records[x];

            // Add the info of the valid or not valid certificate
            r.valid_certificate = valid_certificate;

            if(apps[r.tech_name]){
                r.installed = apps[r.tech_name];
            } else {
                r.installed = false;
            }
            // Merge products into records by app_tech_name
            r.products = products.filter( p => p.app_tech_name === r.tech_name)
        }
        res.status(200).json({ records: records});

    });

    
};
