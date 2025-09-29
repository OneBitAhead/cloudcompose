const path = require("node:path");
const http = require("node:http");
const fsp = require("node:fs/promises");
const express = require('express');
const session = require('express-session');
const betterSqlite3 = require('better-sqlite3');
const SqliteStore = require('./libs/middleware/SqliteStore')(session);
const SocketConnector = require("./libs/connectors/SocketConnector");
const WebSocket = require('ws');
const Tenant = require("./libs/Tenant");
const Helper = require("./libs/Helper");
const socketPath = process.env.F_sockets+"/admin2docker-proxy.sock";
const cors = require('cors');
require("./libs/ErrorHandling")
require("./libs/JsonError");
Error.stackTraceLimit = Infinity;

// Logging
let GLOBAL_LOG_LEVEL = (process.env.LOG_LEVEL && process.env.LOG_LEVEL !== "") ? process.env.LOG_LEVEL:"info";
require("./libs/Logging")(GLOBAL_LOG_LEVEL);
//log.setLevel("App","debug");
//log.setLevel("Proxy","debug");
//log.setLevel("Queue","debug");
//log.setLevel("Instances", "info");
//log.setLevel("Install", "debug");
//log.setLevel("App2Proxy", "debug");
//log.setLevel("Proxy2App", "debug");
//log.setLevel("Permissions", "debug");
//log.setLevel("WebSocket", "debug");



module.exports = class App {

    #config;
    #port;
    #interface;
    #app;    
    #webSocketServer;
    #CONTEXT;
    #store;
    #MODE;
    #proxyDB;

    constructor(config) {

        this.#config = config || {};
        this.#port = this.#config.port || '5002';
        this.#interface = this.#config.interface || '0.0.0.0';

        // Base app
        this.#app = express();
        this.#app.use(cors({ credentials: true }));

        // for BODY: application/json
        this.#app.use(express.json());
        // for BODY: application/x-www-form-urlencoded
        this.#app.use(express.urlencoded({ extended: true }));

        // Serve static files from the 'frontend' directory
        this.#app.use('/', express.static('frontend', {
            // disable cache?
            //setHeaders: (res, path) => {
            //    res.setHeader('Cache-Control', 'no-store');
            //},
            //etag: false
        }));

        // No powered by
        this.#app.disable('x-powered-by');


        this.#app.use((req, res, next) => {            
            // MODE?
            if(this.#MODE === "install"){
                // Only the following routes are allowed           
                if(["/install", "/installStatus"].indexOf(req.url) === -1) return res.redirect("/install");
                return next();             
            }
            //######### check the tenant (from URL) #########
            let { tenantId, tenant } = this.#getTenant("http", req);  
            if(!tenant) return next("NoClient:"+tenantId);  
            req.tenant = tenant;          
            //##############################################
            res.setHeader('X-Powered-By', 'OneBitAhead GmbH');
            next();
        });   
        

        
        this.#init();

    }

    get MODE(){
        return this.#MODE;
    }


    async #init() {

        this.#CONTEXT = {
            app: this.#app, 
            tenants:{},          
            middleware: {},
            queueJobs: {},
            // LOCALES
            LOCALES: {},
            LOCALES_LIST:{},
            // Keycloak usage?
            USE_KEYCLOAK: (process.env.KC_DOMAIN.trim()==="") ? false: true          
        }

        // 0) Init proxy db!
        await this.#initProxyDB();

        // 1) STORE!! (sessions in sqlite)
        this.#initStore();
        this.#CONTEXT.store = this.#store;
       
        // register jobs
        this.#CONTEXT.registerJobFunction = (options) => {
            // since we are sending cmd in events no ":" is allowed!!
            if (!options.cmd || options.cmd.indexOf(":") !== -1) {
                var msg = `Command name missing or contains ':' --> '${options.cmd}'`;
                throw new Error(msg);
            }    
            this.#CONTEXT.queueJobs[options.cmd] = { scope: options.scope, uniqueness: options.uniqueness, onRun: options.onRun, getContext: options.getContext };       
        }

        // 2) init web socket handler
        await this.#initMultiTenantWebSocketHandler();                   
        
        // Use keycloak OR internal auth        
        if(this.#CONTEXT.USE_KEYCLOAK == true) {            
            // init passport strategy and routes
            this.#CONTEXT.keycloak = new (require("./libs/middleware/KeyCloakPassport.mjs").default)(this.#CONTEXT);            
        } else {
            // add the Middleware for local auth
            this.#CONTEXT.localAuth = new (require("./libs/middleware/LocalAuthPassport.mjs").default)(this.#CONTEXT);            
        }
        
        // business functions
        this.#CONTEXT.functions = new (require("./BusinessFunctions"))(this.#CONTEXT);

        // connection to cc-manager (there the locales of the apps are requested :))
        this.#CONTEXT.cpCon = await this.#initManagerConnector();

        // 3) Init clients
        await this.initTenants();

        // 4) Init routes
        this.#initRoutes();

        // read it once
        var indexHtmlBuffer = (await fsp.readFile(path.join(__dirname, './staticPages', 'index.html'))).toString();
        // add the version number!
        indexHtmlBuffer = Helper.prepareTemplate(indexHtmlBuffer, {CLOUD_COMPOSE_VERSION: process.env.VERSION});

        // catch all "/*rest" or "*" ??
        this.#app.use((req, res) => {
            res.set('Content-Type', 'text/html');
            res.send(indexHtmlBuffer);              
        });
    }

    async #initProxyDB(){

        let ccDB = path.join(process.env.F_adminData, "cloudcompose.db");
        this.#proxyDB = new betterSqlite3(ccDB, {});
        this.#proxyDB.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL                
            )
        `);                            
        // this.setValue("baseDomain", "local2.cloudcompose.de");
        // this.setValue("defaultTenant", "cc");
    }

    setValue(key, value){
        var record = this.#proxyDB.prepare('SELECT * FROM settings WHERE key = :key').all({key: key});
        if(record.length === 0){
            this.#proxyDB.prepare('INSERT INTO settings (key, value) VALUES (:key, :value)').run({key: key, value: value});
        } else {
            this.#proxyDB.prepare('UPDATE settings SET value = :value WHERE key = :key').run({key: key, value: value});
        }
    }

    
    getValue(key){
        var records = this.#proxyDB.prepare('SELECT * FROM settings WHERE key = :key').all({key: key});
        if(records.length === 0) return undefined;
        else return records[0].value;
    }


    // Init store
    #initStore() {
     
        // Set up SQLite session store                 
        this.#store = new SqliteStore({
            client: this.#proxyDB,
            ttl: 24 * 60 * 60 * 1000, // 1 day            
            expired: {
                clear: true,
                intervalMs: 900000 //ms = 15min
            }
        });

        var baseDomain = this.getValue("baseDomain") || "";
        log.info("App", `Set base domain for cookie: ${baseDomain}`);

        this.#app.use(session({
            store: this.#store,
            secret: 'afoli243532895ü234523502üp53q25',
            name: 'cloudcompose',
            resave: false,
            saveUninitialized: false,
            cookie: {
                domain: baseDomain,
                httpOnly: true,
                secure: false, // Set to true if using HTTPS
                maxAge: 24 * 60 * 60 * 1000
            }
        }));
   }
    
   
    async initTenants(options = {}){

        // check the number of existing customer databases        
        this.#CONTEXT.tenants = {}; 
        let dataDir = path.join(process.env.F_adminData);
        try{
           var dbFiles = await fsp.readdir(dataDir); 
           var tenantCount = 0;                 
           
           for(var x in dbFiles){                
                let dbName = dbFiles[x];
                if(dbName.startsWith("tenant")){
                    try{
                        let tenant = new Tenant(dbName, this.#CONTEXT);                
                        await tenant.init({withSync: options.withSync});                                        
                        tenantCount++;
                    }catch(e){
                        log.error("App", e);
                    }
                }
           }

           if(tenantCount === 0){
            log.info("App",`-- INSTALL MODE (no tenant db found in '${process.env.F_adminData})-- `)
            this.#MODE = "install";
            this.#CONTEXT.proxyConnection.send({topic:"SET_MODE", type: "install"});
            return;
           }

           log.info("App","-- LIVE MODE (found at least one tenant db)")
           this.#MODE = "live";
           this.#CONTEXT.proxyConnection.send({topic:"SET_MODE", type: "live", tenants: Object.keys(this.#CONTEXT.tenants)});
                                   
        }catch(e){
            log.error("App", e, "Loading tenants");
            return;
        }      
                       
    }


    async #initMultiTenantWebSocketHandler(){

        let wsFileBuffer = await fsp.readFile(path.join(__dirname,'./libs/websockets/FrontendSocketHandler.js'));
        // Frontend JavaScript class (instead of socket.io)
        this.#CONTEXT.app.get("/ws", (req, res) => {               
            res.set('Content-Type', 'application/javascript');
            return res.status(200).send(wsFileBuffer);          
        });
        // Start the ws .... 
        this.#webSocketServer = new WebSocket.Server({ noServer: true }); 
    }


    // Initialize routes
    #initRoutes() {
        // installer
        require("./routes/install")(this, this.#CONTEXT);
        // apps
        require("./routes/apps")(this.#CONTEXT);
        // Users
        require("./routes/users")(this.#CONTEXT);
        // Instances management
        require("./routes/instances")(this.#CONTEXT);
        // Permissions
        require("./routes/permissions")(this.#CONTEXT);
        // Settings
        require("./routes/settings")(this.#CONTEXT);
        // Settings
        require("./routes/invoices")(this.#CONTEXT);
        // Certificates
        require("./routes/certificates")(this.#CONTEXT);
        // Queue
        require("./routes/queue")(this.#CONTEXT);
        // Locales
        require("./routes/locales")(this.#CONTEXT);    

    }



    async #loadLocales(){

        var locales = await fsp.readdir(path.join(__dirname,"./locales"));
        for(var x in locales){
            let localeFile = path.join(__dirname, "./locales", locales[x]);
            let locale = locales[x].split(".")[0];
            try{                
                var json = require(localeFile);
                // add empty namespace for apps
                json.app_locales = {};
                this.#CONTEXT.LOCALES[locale] = json;  
                this.#CONTEXT.LOCALES_LIST[locale] = {
                    "name": `${json.flag} ${json.language}`,
                    "language": json.language,
                    "flag": json.flag
                };                

            }catch(e){
                log.error("App", `Error in locale: ${e.toString()}`);
            }
        }

        // try to get the app locales
        var appLocales = await this.#CONTEXT.cpCon.send({ tenantId: "*", topic: "apps", cmd: "locales" });
        log.debug("App", {appLocales: Object.keys(appLocales)}, `App locales for:`);
        for(var x in appLocales){
            let app = x;
            let l = appLocales[x];            
            for(var y in this.#CONTEXT.LOCALES){
                if(l[y]) this.#CONTEXT.LOCALES[y].app_locales[app] = l[y];                
            }
        }

    }


    async #onManagerConnect(){

        log.info("Socket","Connected to server socket: refresh locales and sync available apps")
      
        // Locales of the admin-ui (needs the socket!)
        await this.#loadLocales();

        // for each client:
        for(var tenantId in this.#CONTEXT.tenants){
            this.#CONTEXT.tenants[tenantId].syncWithManager();         
        }       
    
        
    }

    async #initManagerConnector(){

        const con = new SocketConnector({
            type: "client",
            debug: false, 
            sockets: {
                serverSocket: socketPath
            },
            onConnect: ()=>{
                this.#onManagerConnect();                 
            }
        });

        // Calls from docker-proxy (e.g. stats for docker containers!)
        con.setDispatcherFunction(async (data) => {

            try{
                var topic = data.topic;          
                switch(topic){
                    case "docker:stats": 
                        // TODO: Tenants ?!
                        for(var x in this.#CONTEXT.tenants){
                            let tenant = this.#CONTEXT.tenants[x];
                            var stats = await this.#CONTEXT.functions.combineStats(tenant, data.payload);                    
                            tenant.db.wsh.emit(`docker:stats`, stats);                           
                        }
                        break;

                    case "docker:install":
                        // Broadcast to correct tenant and all ADMINS there
                        var tenant = this.#CONTEXT.tenants[data.tenantId];
                        if(!tenant) return {error: `No tenant with id: ${data.tenantId}`};                        
                        // TODO
                        //tenant.sendInstallStatus(data.payload);                       

                        break;
                    
                    case "getTenants": 
                        for(var x in this.#CONTEXT.tenants){
                            // tell the cc-manager that this tenant exists
                            this.#CONTEXT.tenants[x].registerAtManager();
                        }
                        break;

                    case 'getLocalAppPassword':

                        var tenant = this.#CONTEXT.tenants[data.tenantId];
                        if(!tenant) return {error: `No tenant with id: ${data.tenantId}`};

                        var email = data.payload.email;
                        var project = data.payload.project;

                        var pwd = await tenant.db.table("app_passwords").getLocalAppPassword({}, email, project);                     
                        return {pwd: pwd}

                    case 'getLocalAppCredentialsOfAnyAdmin':

                        var tenant = this.#CONTEXT.tenants[data.tenantId];
                        if(!tenant) return {error: `No tenant with id: ${data.tenantId}`};

                        var project = data.payload.project;
                        var credentials = await tenant.db.table("app_passwords").getLocalAppCredentialsOfAnyAdmin({}, project);
                        return credentials;

                    
                    default:  log.error("App", data, "Data via socket without valid topic?");    
                }          
            }catch(e){
                log.error("App", e, "DispatchError:")
            }

        });

        log.info("App", "Try to connect to cc-manager socket...");
        await con.init()
        log.info("App",`Socket for docker-proxy connection initalized: ${socketPath}`);
       
        return con;


    }



    #getTenant(type, req){

        let tenantId = null;
        let tenant = null;
                
        if(type === "socket"){
            // check for localhost (e.g. local dev)
            if(req.headers.host.startsWith("localhost")){
                tenantId = Object.keys(this.#CONTEXT.tenants)[0];
                log.debug("WebSocket", `Take default tenant (e.g. in localhost env): ${tenantId}`);                    
            } else {
                let subdomainParts = (req.headers.host.split(".")[0]).split("-");
                tenantId = subdomainParts[subdomainParts.length-1];                           
            }         
            
        } else if(type === "http"){

            if(req.hostname === "localhost"){
                tenantId = Object.keys(this.#CONTEXT.tenants)[0];
                log.debug("App", `Take default tenant (e.g. in localhost env): ${tenantId}`);                                    
            } else {
                tenantId = req.host.split(".")[0];            
            }                                
                 
        }

        tenant = this.#CONTEXT.tenants[tenantId];  
        


        return {tenantId, tenant}


        

    }



    // Start express app
    start() {

        return new Promise((resolve, reject) => {

            // Start the server
            var server = http.createServer(this.#app).listen(this.#port, this.#interface, (err) => {
                log.info("App",`ADMIN-UI: http://${this.#interface}:${this.#port}`)
                log.info("App",`CLOUD COMPOSE VERSION: ${process.env.VERSION}`);
                
                resolve(true);
            });
            server.on('clientError', function (e) {
                // Handle your error here
                log.error("App", "CLIENT ERROR:"+ e);
            });
            server.on('upgrade', (req, socket, head) => {

                //######### check the tenant ###############                                 
                // get tenant id (last part of subdomain...separated by "-") (e.g. uptime-kuma-testkunde1.cloudcompose.de) => testkunde1
                let { tenantId, tenant } = this.#getTenant("socket", req);            
                if(!tenant) {
                    log.error("NoClient:"+tenantId);            
                    socket.destroy();
                    return;
                }
                //##############################################          
                this.#webSocketServer.handleUpgrade(req, socket, head, async(socket) => { 
                    req.tenant = tenant;
                    req.tenantId = tenantId;                    
                    tenant.wsh.upgrade(req, socket, head);
                });

               
            });

        })
    }



}






