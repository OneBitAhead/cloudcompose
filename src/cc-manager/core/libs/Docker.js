const util = require('util');
const { exec } = require('child_process');
const { spawn } = require('child_process');
const execAsync = util.promisify(exec);
const path = require("node:path")
const fsp = require("node:fs/promises");
const os = require('os');
const randomUUID = require("node:crypto").randomUUID;



module.exports = class Docker {


    #CONTEXT;
    // socket connection to admin-ui
    #con;
    //stats of running containers (healty, started, exited...etc.)
    #processStats;
    #statInterval;
    // stream with stats (memory, cpu, io)
    #ressourceStats;
    #systemStats;
    #network;
    #DEFAULT_UID;

    // Folders for volumes
    #internalMountFolder;
    #externalMountFolder;
    // Folder for docker compose (json) files
    #projectFolder;

    #exposedPortStart;
    #label;

    constructor(CONTEXT) {

        this.#CONTEXT = CONTEXT;

        this.#con = CONTEXT.con;
        this.#label = 'cloudcompose_group=cloudcompose';
        this.#exposedPortStart = 10000;
        this.#network = process.env.LOAD_BALANCER_NETWORK;        
        log.debug("Docker", `Use network: ${this.#network}`);

        // Volume Rights!
        this.#DEFAULT_UID = process.env.DEFAULT_UID || 1000;
        
        // stats interval: get stats all 2 seconds
        this.#processStats = {};
        this.#ressourceStats = {};
        this.#systemStats = {};

        this.#startStreamContainerStats()
        this.#generateAllStats()

        this.#statInterval = setInterval(async () => {
            this.#generateAllStats();
        }, 5000)

        this.#projectFolder = process.env.F_projects;
        // mount path (external -> the docker container is started outside)
        this.#internalMountFolder = process.env.F_container_volumes;
        this.#externalMountFolder = process.env.ABSOLUTE_MOUNT_FOLDER;       
    }


    async #sleep(sleep){
        return new Promise((resolve)=>{setTimeout(()=>{resolve()},sleep)});
    }


    async #generateAllStats() {

        try {
            // fetch info
            await this.#getInfo();
            // fetch system info
            await this.#systemInfo();
            await this.#con.send({
                topic: "docker:stats", payload: {
                    ps: this.#processStats,
                    stats: this.#ressourceStats,
                    system: this.#systemStats
                }
            })
        } catch (e) {          
            log.error("Docker", e, `Send topic 'docker:stats'`);
        }

    }



    async #getDiskUsage() {

        var cmd = `df -B1 -P /`;
        var { stdout, stderr } = await execAsync(cmd);
        if (stderr) throw err;
        const lines = stdout.trim().split('\n');
        // The second line (lines[1]) contains the data (header is lines[0])
        // Clean up cases like "cc-docker-proxy  | overlay ..."
        let line = lines.find(l => l.includes(" /")); // look for line with " /" at end
        if (!line) {
            console.error('No matching line');
            return {};
        }
        // Split and handle possible extra fields/columns
        let parts = line.replace(/\s+/g, ' ').trim().split(' ');
        /*
            Filesystem     1024-blocks  Used    Available Capacity Mounted on
            /dev/sda1       1000000      750000  250000    75%      /
        */
        const [filesystem, blocks, used, available, percent, mount] = parts.slice(-6); // the last 6 columns
        const json = {
            total: parseInt(available) + parseInt(used),
            used: parseInt(used),
            percent: parseInt(percent),
            mount
        };
        return json;
    }

    async #getMemoryUsage() {

        const total = os.totalmem();     // bytes
        const free = os.freemem();       // bytes
        const used = total - free;

        const mem = {
            total,
            free,
            used,
            percent: +((used / total) * 100).toFixed(2)
        };

        return mem;

    }



    async #systemInfo() {

        try {
            var { stdout } = await execAsync(`docker system info --format '{{json .}}'`);
            const systemInfo = JSON.parse(stdout);

            // Disk Usage
            const disk = await this.#getDiskUsage();
            // Memory usage
            const memory = await this.#getMemoryUsage();

            // Cpu utilization (guess)
            var cpuConsumption = 0;
            for (var x in this.#ressourceStats) {
                if (x.startsWith("cc-")) {
                    cpuConsumption += parseFloat(this.#ressourceStats[x].CPUPerc, 10)
                }
            }

            this.#systemStats = {
                systemInfo: systemInfo,
                disk: disk,
                memory: memory,
                cpuPercent: Math.round(cpuConsumption * 100) / 100
            }

        } catch (e) {
            return { error: e.toString() }
        }

    }


    async #getInfo(project) {

        //console.time("statsFromDocker");
        var cmd = [`docker ps -a`];

        if (this.#label !== "") cmd.push(`--filter "label=${this.#label}"`);
        if (project) cmd.push(`--filter "label=com.docker.compose.project=${project}"`);
        cmd.push(`--format "{{json .}}"`);
        cmd.push(`| jq -s`);
        cmd = cmd.join(" ");


        const { stdout } = await execAsync(cmd);
        //console.timeEnd("statsFromDocker");
        const stats = JSON.parse(stdout);

        for (var x in stats) {

            // Parse the ports
            if (!stats[x].Ports || stats[x].Ports === "") stats[x].Ports = {};
            else stats[x].Ports = this.#parseExposedPorts(stats[x].Ports);

            // Parse labels
            var labels = {};
            stats[x].Labels.split(",").map((item) => {
                let l = item.split("=");
                labels[l[0]] = l[1];
            });
            stats[x].Labels = labels;


            // Parse state/status
            stats[x].hasHealthCheck = false;

            if (stats[x].Status.indexOf("(healthy)") !== -1) {
                stats[x].displayState = "healthy";
                stats[x].hasHealthCheck = true;
            } else if (stats[x].Status.indexOf("(health: starting)") !== -1) {
                stats[x].displayState = "starting";
                stats[x].hasHealthCheck = true;
            } else if (stats[x].State === "running") {
                stats[x].displayState = "running";
            } else if (stats[x].State === "exited") {
                stats[x].displayState = "exited";
            }
        }

        var statsByAppUUID = {};
        for (var x in stats) {
            // container ids could change i compose down/up is used in tests!!
            // therefore we combine the containers by app uuid!
            var appUUID = stats[x].Labels.cloudcompose_uuid;
            if (statsByAppUUID[appUUID] === undefined) statsByAppUUID[appUUID] = [];
            statsByAppUUID[appUUID].push(stats[x]);


            // delete stats from ressourceStats if exited!
            if (stats[x].displayState === "exited") {
                let n = stats[x].Names;
                delete this.#ressourceStats[n];
            }

        }

        if (project) {
            return statsByAppUUID;
        } else {
            this.#processStats = statsByAppUUID
        }


    }



    async #startStreamContainerStats() {


        var args = ['stats'];// optionally: ',', '--no-stream'
        args.push('--format', '{{json .}}')

        const dockerStats = spawn('docker', args);

        dockerStats.stdout.on('data', (data) => {
            // `data` may contain multiple lines (one per container)
            data
                .toString()
                .split('\n')
                .filter(line => line.trim())
                .forEach(line => {
                    try {
                        const stats = JSON.parse(line);
                        // stats is a JSON object! Do something with it:
                        if (stats.Name.startsWith("cc-")) this.#ressourceStats[stats.Name] = stats;
                    } catch (err) {
                        // Ignore parse errors (can happen on incomplete lines)
                    }
                });
        });

        dockerStats.stderr.on('data', (data) => {
            log.error("Docker", data, `stderr:`);
        });

        dockerStats.on('close', (code) => {
            log.debug("Docker", `Docker stats process exited with code ${code}`);
        });


    }


    #parseExposedPorts(portsString) {

        // Split on comma, trim whitespace
        const portMappings = portsString.split(',').map(s => s.trim());

        // Filter out IPv6 entries (those starting with [::])
        const filteredMappings = portMappings.filter(mapping => !mapping.startsWith('[::]') && !mapping.startsWith('[::1]'));

        const parsedPorts = filteredMappings.map(mapping => {
            // Match: host:hostPort->containerPort/protocol
            const match = mapping.match(/^(.+):(\d+)->(\d+)\/(\w+)$/);
            if (match) {
                return {
                    host: match[1],
                    hostPort: parseInt(match[2], 10),
                    containerPort: parseInt(match[3], 10),
                    protocol: match[4]
                };
            }
            // If mapping does not match expected pattern, return as raw string
            return { raw: mapping };
        });

        // ignore ip6!
        return parsedPorts;

    }


    async stats() {
        // return the last fetched stats from docker            
        return {
            ps: this.#processStats,
            stats: this.#ressourceStats,
            system: this.#systemStats
        }

    }


    async checkExposedPorts() {

        // first get all exposed ports!
        // even from NOT labeled docker instances!!
        var cmd = `docker ps -a --format "{{json .}}" | jq -s`;
        // if(containerId) cmd + ` ${containerId}`;
        const { stdout } = await execAsync(cmd);

        var stats = JSON.parse(stdout);

        var ports = [];

        for (var x in stats) {
            // Parse the ports
            if (!stats[x].Ports || stats[x].Ports === "") continue;
            ports = ports.concat(this.#parseExposedPorts(stats[x].Ports));
        }

        var exposedPorts = [];
        var maxOf10000 = 0;
        for (var x in ports) {
            let p = ports[x].hostPort;
            exposedPorts.push(p)
            if (p >= this.#exposedPortStart && p > maxOf10000) maxOf10000 = p;
        }
        if (maxOf10000 === 0) maxOf10000 = this.#exposedPortStart;

        return { ports: ports, nextFreePort: maxOf10000 + 1 };



    }

    async #fileExists(path, withInfo) {
        try {
            await fsp.access(path);

            if(withInfo === true){
                const stats = await fsp.stat(path);
                if (stats.isFile()) return 'file';
                else if (stats.isDirectory()) return 'directory';
                else return 'other';               
            }
            return true;  // File exists
        } catch (e) {
            return false; // File does not exist or no access
        }
    }






    async #checkComposeValidity(tenant, project){

        var file = path.join(this.#projectFolder, tenant.id, project + ".json");        
        var exists = await this.#fileExists(file);
        if(!exists) {
            log.error("Docker",`Compose file not found: ${file}`)
            throw new Error("No project file:" + file);
        }
        const { code, stdout, stderr } = await this.#CONTEXT.runCommand(`docker compose -f ${file} config --quiet`);
        if(code === 0) return true;
        
        log.error("Docker",`Compose file invalid: ${file}: ${stderr}`)
        throw new Error(stderr);


    }


    async #createVolume(tenant, project, name, v, integrationFolder, simulate) {

        var type = v.type;
        var volumeString = '';
        var mountPath = path.join(this.#externalMountFolder, tenant.id,project, name);
        var copyPath  = path.join(this.#internalMountFolder, tenant.id,project, name);

            
        // default type
        if(!type) type = "rw";
        if (["rw", "ro"].indexOf(type) === -1) throw new Error("VolumeTypeEither 'rw' or 'ro'");

        var internalPath = v.internalPath;
        if(!internalPath) throw new Error("VolumeNeedsAnInternalPath");

        // return...
        var info = {
            path: mountPath,      
            type: type,
            internalFolder: internalPath
        }     
            
        //##########################################
        // 1) EXISTING FOLDERS / SOCKETS
        //##########################################
        if (v.externalPath) {
            
            info.externalPath = v.externalPath;
            // special direct (no creation of mount point!)
            // we are using "existing" folder (e.g. for /var/run/docker.sock
            volumeString = `${v.externalPath}:${internalPath}`;
            if (type) volumeString += `:${type}`;  

        } 
        //##########################################
        // 2) COPY SOURCES (folder or file)
        //##########################################        
        else if (v.sourcePath) {

            info.sourcePath = path.join(integrationFolder,v.sourcePath);        
            volumeString = `${mountPath}:${internalPath}:${type}`;  

            // check if source exists
            var sourceType = await this.#fileExists(info.sourcePath, true);
            if(!sourceType) throw new Error("VolumeSourceNotExisting:"+info.sourcePath);            

            if(!simulate){
                // 1) copy content to mountPath
                if(sourceType === "directory"){
                    // copy folder and be done
                    await fsp.cp(info.sourcePath, copyPath, { recursive: true });
                    log.debug("Docker", `Folder copied from '${v.sourcePath}' to '${copyPath}'`);                    

                } else if(sourceType === "file"){                    
                    // copy file and use the name in the volume                 
                    var fileName = path.basename(info.sourcePath);

                    volumeString = `${mountPath}/${fileName}:${internalPath}:${type}`;  

                    await fsp.cp(info.sourcePath, path.join(copyPath,fileName), { recursive: true });
                    log.debug("Docker", `File copied from '${v.sourcePath}' to '${copyPath}'`);                    
                }                   
                // set user rights!
                try {
                    const { stdout } = await execAsync(`chown -R ${this.#DEFAULT_UID}:${this.#DEFAULT_UID} ${copyPath}`);
                    log.debug("Docker", stdout);            
                } catch (e) {
                    log.error("Docker", e);
                }
                log.debug("Docker", `Prepare Mount: ${mountPath}:${internalPath}:${type}`)
            }

        } 
        //##########################################
        // 3) Create a volume (empty) - default
        //##########################################        
        else {

            volumeString = `${mountPath}:${internalPath}:${type}`;      

            if(!simulate){
                // since this service is NOT running within a docker container anymore...
                // we need to create it at the mountFolder position
                ///await fsp.mkdir(`/container-volumes/${project}/${name}`, { recursive: true });
                await fsp.mkdir(mountPath, { recursive: true });

                // set user rights!
                try {
                    const { stdout } = await execAsync(`chown -R ${this.#DEFAULT_UID}:${this.#DEFAULT_UID} ${mountPath}`);
                    log.debug("Docker", stdout);            
                } catch (e) {
                    log.error("Docker", e);
                }
                log.debug("Docker", `Prepare Mount: ${mountPath}:${internalPath}:${type}`)
            }
        }                 
        return {volumeString: volumeString, volumeInfo: info};

    }

    /**
     * A docker container (project) name should never be longer
     * than 63 characters (since a customer has max 16 characters...)
     * 
     * cc-app-<tenantId>-<appName>-exposedPort 
     *  7  +  max(16)  + max(30)   + 7 should be enough!
     * 
     * @param {*} tenant 
     * @param {*} name 
     * @param {*} multi_instance 
     * @param {*} exposedPort 
     * @returns 
     */
    #getAppName(tenant, name, multi_instance, exposedPort){

        // clean name...
        if (name.startsWith(`cc-app-${tenant.id}-`)) name = name.substring(`cc-app-${tenant.id}-`.length);
        else if (name.startsWith("cc-app-")) name = name.substring("cc-app-".length);                        

        // multi instance?
        if (multi_instance === true && exposedPort !== undefined) name = name + "_" + exposedPort;
        
        // build name and return the correct name!
        name = `cc-app-${tenant.id}-${name}`;


        return name;
    }



    async createProject(tenant, full_tech_name, uuid, local_app_passwords) {

        var simulate = false;

        log.debug("Docker", `Create project: ${tenant.id}, ${full_tech_name}`);

        var appData = this.#CONTEXT.Integrations.getInfo(tenant, full_tech_name, local_app_passwords);
                
        if(!appData) return { error: "No such app:"+full_tech_name};

        // create docker compose file!   
        var { ports, nextFreePort } = await this.checkExposedPorts();
        var exposedPort = nextFreePort;

        // project name from first container or given..    
        var project = (appData.project) ? appData.project: Object.keys(appData.containers)[0];  
        project = this.#getAppName(tenant, project || appData.tech_name, appData.multi_instance, exposedPort);
                
                    
        // all port mappings of the project
        var port_mappings = [];

        // collect data for integration scripts
        var integrationData = {
            uuid: uuid,
            project: project,
            containers: {}
        }


        // Custom install?!
        if(this.#CONTEXT.Integrations.hasCustomInstall(full_tech_name) === true){

            var port_mappings = await this.#CONTEXT.Integrations.runCustomInstall(tenant, full_tech_name);
            return {   
                project: full_tech_name,          
                port_mappings: port_mappings               
            }           
        }                
        if (!appData.containers || Object.keys(appData.containers).length === 0) return {error: "No containers contained"};
             

        // config file (as json)
        var dockerCompose = {
            "services": {},
            "networks": {
                [this.#network]: {
                    external: true             
                }
            }
        }

        for (var x in appData.containers) {

            let c = appData.containers[x];
            var containerName = this.#getAppName(tenant, x, appData.multi_instance, exposedPort);

            integrationData.containers[containerName] = {};

            var conf = {
                image: `${c.image}${(c.version) ? `:${c.version}` : ''}`,
                container_name: containerName,
                // ALWAYS SET LABEL
                labels: [this.#label, `cloudcompose_uuid=${uuid}`]
            }

            // All allowed as arrays :)
            if (c.entrypoint) conf.entrypoint = [].concat(c.entrypoint);
            if (c.command) conf.command = c.command;
            if (c.extra_hosts) conf.extra_hosts = c.extra_hosts;
            if (c.healthcheck) conf.healthcheck = c.healthcheck;

            if(c.labels) conf.labels = conf.labels.concat(c.labels);
            

            if (c.env_params && Object.keys(c.env_params).length > 0) {
                conf.environment = {};
                for (var x in c.env_params) {
                    var value = c.env_params[x];                             
                    // generated var?
                    if(typeof value === "string" && value.startsWith("GENERATED_VAR:")){
                        let envKey = value.substring("GENERATED_VAR:".length);                        
                        if(!appData.generated_vars[envKey]) {
                            log.error("Docker", "GeneratedVar not configured:"+envKey);
                            return {error:"GeneratedVar not configured:"+envKey};
                        }
                        conf.environment[x] = appData.generated_vars[envKey];
                    } else {
                        conf.environment[x] = value;
                    }
                }
                integrationData.containers[containerName].environment = conf.environment;
            }


            if (c.ports && Object.keys(c.ports).length > 0) {
                conf.ports = [];           
                integrationData.containers[containerName].port_mappings = [];   
                integrationData.containers[containerName].externalPorts = [];            
                for (var x in c.ports) {

                    // check INTEGER
                    if (isNaN(x)) return {error: `Port is not a number: ${x}`};

                    let subdomain = c.ports[x].subdomain;
                    if (appData.multi_instance === true) subdomain = subdomain + "_" + exposedPort;

                    // add to port mappings!  
                    let mapping = {container: containerName, internalPort: x, externalPort: exposedPort, subdomain: subdomain || null};                  
                    port_mappings.push(mapping)
                    integrationData.containers[containerName].port_mappings.push(mapping);
                    integrationData.containers[containerName].externalPorts.push(exposedPort);

                    // add to config (technical mapping!)                   
                    conf.ports.push(`${exposedPort}:${x}`);
                    
                    // increase port number
                    exposedPort++;
                }

                integrationData.containers[containerName].ports = conf.ports;
            }
            if (c.volumes && Object.keys(c.volumes).length > 0) {
                conf.volumes = [];
                integrationData.containers[containerName].volumes = {};
                for (var vId in c.volumes) {
                    let v = c.volumes[vId];
                    var { volumeString, volumeInfo } = await this.#createVolume(tenant, project, vId, v, appData.basePath, simulate);
                    conf.volumes.push(volumeString);
                    integrationData.containers[containerName].volumes[vId] = volumeInfo;
                }
                
            }
            if (c.dependsOn && c.dependsOn.length > 0) conf.depends_on = c.dependsOn;

            conf.restart = (c.restart) ? c.restart : "unless-stopped";
            if (c.uid || c.gid) conf.user = `${c.uid || 1000}:${c.gid || 1000}`;
            else if(c.user) conf.user = c.user;


            if (c.readOnly === 1) conf.read_only = true;

            // Network (default -> haproxy needs to reach this!)
            conf.networks = [
                this.#network
            ]
            
            dockerCompose.services[containerName] = conf;
        }


        log.debug("Docker", dockerCompose, `Docker compose json ${project}:`);

                
        var file = path.join(this.#projectFolder, tenant.id, project + ".json");
        await fsp.mkdir(path.join(this.#projectFolder, tenant.id),{recursive:true});
        await fsp.writeFile(file, JSON.stringify(dockerCompose, null, 4));

        // set rights to default user!
        try {
            const { stdout } = await execAsync(`chown ${this.#DEFAULT_UID}:${this.#DEFAULT_UID} ${file}`);
            log.debug("Docker", stdout);            
        } catch (e) {
            log.error("Docker", e);
        }



        // check validity!
        await this.#checkComposeValidity(tenant,project);
        await this.#dockerComposePullWithProgress(tenant, file, project)


        var cmd = ["docker compose"]
        cmd.push(`-f ${file}`);
        cmd.push(`-p ${project}`);
        cmd.push(`up -d`);

        if (simulate) {
            return {
                simulate: true,
                project: project,                
                json: dockerCompose,
                port_mappings: port_mappings,
                generated_vars: appData.generated_vars 
            }
        }

        try {
            const { stdout } = await execAsync(cmd.join(" "));
            
            // store this as instance
            // refresh stats directly
            await this.#getInfo()

            return {        
                project: project,               
                integrationData: integrationData,
                json: dockerCompose,
                port_mappings: port_mappings,                
                generated_vars: appData.generated_vars
            }


        } catch (e) {
            log.error("Docker", e);
            return { error: e };
        }


    }


    
    async getState(tenant, container){

        
        var cmd = `docker inspect --format '{"state": "{{.State.Status}}","health": "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}"}' "${container}"`;
        const { code, stdout, stderr } = await this.#CONTEXT.runCommand(cmd);
        if(code === 0){
            try{
                return JSON.parse(stdout);
            }catch(e){
                return {code: code, error: e.toString(), stdout: stdout};    
            }
        } else {
            return {code: code, error: stderr};
        }          

    }

    async runPostinstall(tenant, appIdentifier, integrationData) {

        try {
            if (this.#CONTEXT.Integrations.hasPostinstall(appIdentifier)) {
                
                log.debug("Docker",`Wait 1 seconds before calling postinstall (e.g. for initialization of the container...)`);
                await this.#sleep(1000);                
                var result = await this.#CONTEXT.Integrations.runPostinstall(tenant, appIdentifier, integrationData)
                log.debug("Docker", result, `Postinstall result: `);
                return result;
            } else {
                return {result: `No postinstall for '${appIdentifier}'`}
            }
        } catch (e) {
            log.error("Docker", e)
        }
    }

    #parseSize(str) {
        const match = /^([\d.]+)([kMGT]?B)$/i.exec(str);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const factor = {
            B: 1,
            KB: 1e3,
            MB: 1e6,
            GB: 1e9,
            TB: 1e12
        }[unit];
        return num * factor;
    }


    async #dockerComposePullWithProgress(tenant, file, project, onProgress) {


                

        if(!onProgress){
            onProgress = (progressMap) => {


                var isDownloading = false;
                var isExtracting = false;

                for(var x in progressMap){
                    let item = progressMap[x];
                    if(item.action === "Downloading") isDownloading = true;
                    else if(item.action === "Extracting") isExtracting = true;
                }

                // log.debug("Docker", progressMap, "ProgressMap:");
                log.debug("Docker", {downloading: isDownloading, extracting: isExtracting}, "Progress");
                this.#con.send({topic: "docker:install", tenantId: tenant.id, payload: {project: project, downloading: isDownloading, extracting: isExtracting}});

            };
        }

        return new Promise((resolve, reject) => {

            log.debug("Docker", `docker compose -f ${file} pull`);
            const pull = spawn('docker', ['compose', `-f`, file, 'pull']);
            const progressMap = {}; // { uuid: percent }

            let stderrBuffer = '';
            pull.stderr.on('data', (data) => {

                stderrBuffer += data.toString();
                let lines = stderrBuffer.split('\n');
                if (!stderrBuffer.endsWith('\n')) {
                    stderrBuffer = lines.pop();
                } else {
                    stderrBuffer = '';
                }

                lines.forEach(line => {
                    // Example line: '59c36a444aa7 Extracting [=======>   ]   552B/552B'
                    const match = line.match(/^\s*([a-f0-9]{12})\s+(\w+)\s+\[.*\]\s+([\d.]+[kKMGT]?B)\/([\d.]+[kKMGT]?B)/i);
                    if (match) {
                        const uuid = match[1];
                        const action = match[2];
                        const current = this.#parseSize(match[3]);
                        const total = this.#parseSize(match[4]);
                        let percent = 0;
                        if (!isNaN(current) && !isNaN(total) && total > 0) {
                            percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
                            progressMap[uuid] = { action: action, percent: percent };
                            onProgress({ ...progressMap }); // send a copy to avoid reference quirks
                        }
                    }
                });
            });

            pull.on('error', (err) => {
                reject(new Error(`Failed to execute: ${err.message}`));
            });
            pull.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker compose pull exited with code ${code}: ${stderrBuffer}`));
                }
            });
        });
    }


    async startProject(tenant, project) {

        log.debug("Docker", `Start project: ${project}`);

        var file = path.join(this.#projectFolder, tenant.id, project + ".json");
        
        // IMPORTANT (or the cc-admin-ui is deleted!!)
        // check validity!
        await this.#checkComposeValidity(tenant, project);
        await this.#dockerComposePullWithProgress(tenant, file, project)

        var cmd = ["docker compose"]
        cmd.push(`-f ${file}`);
        cmd.push(`-p ${project}`);
        cmd.push(`up -d`);

        const { stdout } = await execAsync(cmd.join(" "));

        // refresh stats directly
        await this.#getInfo()

        return stdout;
    }

    async stopProject(tenant, project) {

        log.debug("Docker", `Stop project: ${project}`);

        var file = path.join(this.#projectFolder, tenant.id, project + ".json");

        // IMPORTANT (or the cc-admin-ui is deleted!!)
        // check validity!
        await this.#checkComposeValidity(tenant, project);
        
        var cmd = ["docker compose"]
        cmd.push(`-f ${file}`);
        cmd.push(`-p ${project}`);
        cmd.push(`stop`);

        const { stdout } = await execAsync(cmd.join(" "));
        log.debug("Docker", stdout, `Stop result: `)
        
    
        // refresh stats directly
        await this.#getInfo()

        return stdout;
    }
    async deleteProject(tenant, project) {

        log.debug("Docker", `Delete project: ${project}`);

        var result = {}

        var file = path.join(this.#projectFolder, tenant.id, project + ".json");
        // IMPORTANT (or the cc-admin-ui is deleted!!)
        // check validity!
        await this.#checkComposeValidity(tenant, project);
         
        try {
           
            var cmd = ["docker compose"]
            cmd.push(`-f ${file}`);
            cmd.push(`-p ${project}`);
            cmd.push(`down`);
            cmd.push(`-v`)

            const { stdout } = await execAsync(cmd.join(" "));
            result.docker = stdout;

        } catch (e) {
            log.error("Docker", e);
        }

        // Delete any volume of that project!
        try {
            // external 
            var mountPath = path.join(this.#internalMountFolder, tenant.id, project);
            if (await this.#fileExists(mountPath)) {
                await fsp.rm(mountPath, { recursive: true });
                result.volumes = "deleted";
            }
        } catch (e) {
            result.volumes = e;
            log.error("Docker",e);
        }
        // Delete project file        
        try {
            if (await this.#fileExists(file)) {
                await fsp.unlink(file);
                result.file = 'deleted';
            }
        } catch (e) {
            log.error("Docker", e);
            result.file = e;
        }


        // refresh stats directly
        await this.#getInfo();
        
        log.debug("Docker", result, `Stop result:`);

        return result;
    }

    async restart(containerId) {
        const { stdout } = await execAsync(`docker restart ${containerId}`);
        // refresh stats directly
        await this.#getInfo()
        return stdout;
    }


    async start(containerId) {
        const { stdout } = await execAsync(`docker start ${containerId}`);
        // refresh stats directly
        await this.#getInfo()

        return stdout;
    }
    async stop(containerId) {
        const { stdout } = await execAsync(`docker stop ${containerId}`);
        // refresh stats directly
        await this.#getInfo()
        return stdout;
    }
    async delete(containerId) {
        const { stdout } = await execAsync(`docker rm ${containerId}`);
        // refresh stats directly
        await this.#getInfo();
        return stdout;
    }


    async setLimit(tenant, project, containerName, values){


        var info = await this.#getInfo(project); 
        var uuid = Object.keys(info)[0];      
        var containers = info[uuid];
        var containerId = null;
        var hasContainerName = false;
        
        for(var x in containers){
            if(containers[x].Names === containerName) {
                containerId = containers[x].ID;            
                hasContainerName = true;
            }
        }
        
        if(containerId === null || hasContainerName === false) return {error: `No container '${containerName}' in project '${project}'`};

        var results = [];
        

        if(values["cpus"]){
            let cmd = `docker update --cpus "${values["cpus"]}" ${containerName}`;
            const { stdout } = await execAsync(cmd);
            results.push(stdout);

        } 
        if(values["memory"] && values["memory-swap"]){                
            let cmd = `docker update --memory-swap "${values["memory-swap"]}" --memory "${values["memory"]}" ${containerName}`;
            const { stdout } = await execAsync(cmd);
            results.push(stdout);
        }
                
        return results;
            
    }



    async #getDetails(options) {

        options = options || {};
        // with -a (--all) to get stopped containers too!
        var cmd = `docker inspect $(docker ps ${(options.all) ? "-a" : ""} -q --filter "label=${this.#label}") --format "{{json .}}" | jq -s`;
        const { stdout } = await execAsync(cmd);
        const stats = JSON.parse(stdout);
        return stats;
    }


}


