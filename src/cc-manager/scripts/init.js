const fsp = require("node:fs/promises");
const { exec } = require('node:child_process');
const util = require('node:util');
const execAsync = util.promisify(exec);

const blue = '\x1b[34m';
const reset = '\x1b[0m';

const LOCAL_USER_ID  = parseInt(process.env.LOCAL_USER_ID);
const LOCAL_GROUP_ID = parseInt(process.env.LOCAL_GROUP_ID); 

const FOLDERS = {
    "projects": { folder: "/data/manager/projects"},
    "container_volumes": { folder: "/data/manager/container-volumes"},
    "custom_integrations": { folder: "/data/manager/integrations", uid: LOCAL_USER_ID, gid: LOCAL_GROUP_ID},
    // config for admin-ui and manager
    "adminData": { folder: "/data/admin-ui",uid: LOCAL_USER_ID, gid: LOCAL_GROUP_ID }, 
    "config": { folder: "/data/config", uid: LOCAL_USER_ID, gid: LOCAL_GROUP_ID},
    "sockets": { folder: "/data/sockets", uid: LOCAL_USER_ID, gid: LOCAL_GROUP_ID},
    // Haproxy
    "haproxyConf": { folder: "/data/haproxy/conf.d"},
    "haproxySSL": { folder: "/data/haproxy/ssl"}
}



class Init {

    async initialize() {

        // should i run?!
        if (await this.fileExists("/data/init.log")) {
            console.log(`${blue}--- Skip cloud compose init (delete '/data/init.log' to force reinit) ----${reset}`)
            return;
        }

        console.log(`${blue}--- Running cloud compose init ----${reset}`)

     
        // get the version
        var version = "0.0.0";
        try{
            var pack = require("/cc/manager/src/package.json")
            version = pack.version;
        }catch(e){}        

        // get external folder
        var externalFolder = await this.#getExternalFolder();
        console.log(`➡️ Get external mount folder: ${externalFolder}`);
                
        // Write env
        var env = [
            `VERSION=${version}`,                
            "LOG_LEVEL=info", 
            "SOFT_SECRET_ENCRYPTION_PWD=12345",
            "KC_DOMAIN=",
            "REQUEST_LIMIT_PER_SECOND=100",
            "AUTH_REQUEST_LIMIT_PER_SECOND=10",
            "### DOCKER PARAMETERS",            
            `DEFAULT_DOCKER_UID=${LOCAL_USER_ID}`,
            `DEFAULT_DOCKER_GID=${LOCAL_GROUP_ID}`,
            `ABSOLUTE_MOUNT_FOLDER=${externalFolder}`,
            `LOAD_BALANCER_NETWORK=cloudcompose`,
        ]

        //data:cc -->
        env.push("## INTERNAL FOLDER ##")
        for(var x in FOLDERS){
            let f = FOLDERS[x];
            await fsp.mkdir(f.folder, {recursive: true});
            if(f.uid !== undefined && f.gid !== undefined) await this.chown(f.folder, f.uid, f.gid);
            // write to env (so the apps can get the correct folder!)
            env.push(`F_${x}=${f.folder}`);
        }        
        
        console.log(`➡️ Write .env file`);
        await fsp.writeFile("/data/config/.env", env.join("\n"));
        // Be sure to chown the sockets folder to the local user!!
        await this.chown("/data/config/.env", LOCAL_USER_ID, LOCAL_GROUP_ID);
          
         
        // init haproxy!
        await this.initHaproxy();

        // Finally write the init.lgo (so this is not run again!)
        await fsp.writeFile("/data/init.log", "Initialize is done. You can remove this file to reinit on the cc-manager container restart!");
        await this.chown("/data/init.log", LOCAL_USER_ID, LOCAL_GROUP_ID);

        console.log(`✅ Initialization is done`);

    }

    async fileExists(path) {
        try {
            await fsp.access(path);
            return true; // file exists
        } catch(e) {
            return false; // file does not exist
        }
    }

    async chown(path, uid, gid) {
        try {
            await fsp.chown(path, uid, gid);            
        } catch (err) {
            console.error('Failed to change owner:', err);
        }
    }

    async #getExternalFolder(){

        
        var data = await execAsync(`docker inspect $(hostname)`);
        try {
            data = JSON.parse(data.stdout)[0];
        } catch (e) {
            console.log(e);
            return;
        }
        for (var x in data.Mounts) {        
            if (data.Mounts[x].Destination === "/data") return data.Mounts[x].Source+"/manager/container-volumes";
        }
    }


    async initHaproxy(){

    
        console.log("➡️ Write HAProxy configuration");

        // Write base template
        const BASE_TEMPLATE = 
`global
	master-worker
	log stdout format raw local0
	stats timeout 10s

defaults
	# log	global
	mode	http
	option	httplog
	option	dontlognull
	# Prevent slow query attacks      
	timeout connect 5s
	timeout queue 5s
    timeout client  30s
    timeout server  10s
	timeout http-request 5s
	timeout tunnel 1h
	# if the DNS name is not yet resolvable (docker compose ...) stop haproxy to fail at start!
	default-server init-addr none

resolvers docker
  nameserver dns 127.0.0.11:53
  
`;

        await fsp.writeFile("/data/haproxy/conf.d/00_BASE.cfg", BASE_TEMPLATE);

        const FRONTEND_TEMPLATE = 
`frontend cloudcompose

	bind *:80
	# use SNI (searches for the correct certificate?!)
	bind *:443 ssl crt /ssl alpn h2,http/1.1
	# send to SSL...ALWAYS
    http-request redirect scheme https unless { ssl_fc }
	# add "X-Forwarded-For-Header" to add the original IP address 
	option forwardfor	
	## direct 
	use_backend cloudcompose_service


backend cloudcompose_service

	mode http    
    timeout connect 5s
    timeout server 600s
    timeout tunnel 3600s # Required for WebSocket connections
    http-reuse safe    
    option forwardfor  # adds X-Forwarded-For header
    option http-buffer-request  # disable buffering -> needed for e.g. docker registry (joxit)
    option http-server-close    # 
    http-request set-header X-Forwarded-Proto https # SSL is terminated here, so the it in the header -> 'x-forwarded-proto': 'https'
    server cloudcompose1 cc-admin-ui:5001 resolvers docker check inter 2s
    
`         
        await fsp.writeFile("/data/haproxy/conf.d/01_CLOUDCOMPOSE.cfg", FRONTEND_TEMPLATE);


        console.log("➡️ Create self signed certificate (to start with ssl)");
        var data = await execAsync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 365 -subj "/CN=localhost" > /dev/null 2>&1`);
        var data = await execAsync(`cat /tmp/server.key /tmp/server.crt > /data/haproxy/ssl/selfsigned.pem`);        
      

    }



}


var i = new Init()
i.initialize();




