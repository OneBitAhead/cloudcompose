const path = require("node:path");
const fs   = require("node:fs");


module.exports = function init(server, CONTEXT){

    var app = CONTEXT.app;        
    var installStatus = null;


    // If not in install mode...got to default page!
    var checkInstallMode = (req, res, next)=>{
        if(server.MODE !== "install") return res.redirect("/");
        next();
    };

    // read it once
    const installHtmlBuffer = fs.readFileSync(path.join(__dirname, './../staticPages', 'install.html'));

    app.get('/install', checkInstallMode,  async(req, res) => {   
        let installHtmlBuffer = fs.readFileSync(path.join(__dirname, './../staticPages', 'install.html'));
        res.set('Content-Type', 'text/html');
        res.send(installHtmlBuffer);                 
    });

    app.post('/install', checkInstallMode, async(req, res) => {

        if(installStatus === "installing"){            
            return res.json({step: "installing"});
        }
        var tenant_name = req.body.tenant_name;  
        if(!tenant_name || tenant_name === "") return res.status(400).json({errors:{"tenant_name":"Needs to be set"}});
        
        var baseDomain = req.body.base_domain;
        if(baseDomain.substring(0,2)!=="*.") return res.status(400).json({errors:{"base_domain":"Not in wildcard notation"}});

        // Remove the *. from the baseDomain!
        baseDomain = baseDomain.substring(2);
    
        installStatus = "installing";       
        
        res.json({step: "installing"});
     
        setTimeout(async()=>{
            // create the default tenant --> 
            const db = await require("../libs/data/Database")({dbName: `tenant-${tenant_name}.db`, create: true});
            await db.refreshDatabaseStructure();
        
            // Add admin user
            await db.table("users").insert({},{
                email: req.body.email,
                username: req.body.email.split("@")[0],
                role: "admin",
                password: req.body.password
            }); 
            // Add tenant settings (default in proxy db)
            server.setValue("baseDomain", baseDomain);
            server.setValue("defaultTenant", tenant_name);    
            // settings for the tenant db!        
            await db.table("settings").upsert({},{ key: "baseDomain", value: baseDomain});
            await db.table("settings").upsert({},{ key: "tenantId", value: tenant_name});
            installStatus = "done";  
            
            // RELOAD the express app (needed for cookie domain ...)
            // since we are running as sub process in the proxy
            // a process.exit is enough for a restart :)             

            process.exit(42);

        },1);        

     
    });

    app.get('/installStatus', async(req, res) => {         

        if(server.MODE !== "install"){
            res.json({status: "done"});
        } else {
            res.json({status: installStatus});
        }
        
    });

    
};
