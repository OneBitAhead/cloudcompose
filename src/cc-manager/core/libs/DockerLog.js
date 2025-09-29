const { spawn } = require('node:child_process');

const EventEmitter = require("node:events");




module.exports = class DockerLog extends EventEmitter {


    #containerId;
    #process;
    #timeOption;

    constructor(CONTEXT, containerId, timeOption) {
        super();

        this.#containerId = containerId;
        this.#timeOption = timeOption; // "0s"
        try{
            this.#startLog();
        }catch(e){
            log.error("DockerLog", e);
        }
                
    }


    async #sleep(sleep){
        return new Promise((resolve)=>{setTimeout(()=>{resolve()},sleep)});
    }

    stop(){
        if (!this.#process.killed) {
            this.#process.kill(); // Terminate docker logs process
            log.info("DockerLogs",`[${this.#containerId}] Logs stream stopped`);
        }
    }

    async #startLog(){
        
        // Spawn docker logs with follow flag
        var args = ['logs', '-f', this.#containerId];
        if(this.#timeOption) args.push('--since', this.#timeOption);
        this.#process = spawn('docker', args);

        log.info("DockerLog", `[${this.#containerId}] Log started`);
                 
        this.#process.stdout.on('data', (data) => {
            // Pause the stream to handle backpressure
            this.#process.stdout.pause();
            
            // Process the chunk (print it here)
            log.error("DockerLog", data.toString());

            let logString = data.toString();
            if(logString.indexOf("SYNC ROLE MAPPING")!==-1){              
                //log.warn("DOCKERLOG", `[${containerId}] Log told: sync role mapping`)
            }

            this.#process.stdout.resume();
            
        });
        this.#process.stderr.on('data', (data) => {
            log.error("DockerLogs",`[${this.#containerId}] stderr: ${data.toString()}`);
        });
        this.#process.on('close', (code) => {
            log.info(`DockerLogs`, `[${this.#containerId}] Process exited with code ${code}`);
        });
        this.#process.on('error', (err) => {
            log.error('DockerLogs', err, `[${this.#containerId}] Failed to start docker logs process:`);
        });

    }
}


