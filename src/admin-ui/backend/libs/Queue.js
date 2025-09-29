module.exports = class Queue {

    #db
    #wsh;
    #running;
    #tenant;
    #CONTEXT;

    constructor(tenant, CONTEXT) {
        
        this.#tenant = tenant;
        this.#CONTEXT = CONTEXT;
        
        // Tenant specific 
        // web socket handler
        this.#wsh = tenant.wsh;        
        // and DB
        this.#db = tenant.db;
        this.#running = false;   

    }

    async startQueue() {

        if (this.#running !== false) {
            log.debug('Queue', "Already running...")
            return;
        }
        this.#running = true;
        this.#run();

    }


    async reset(){

        log.info('Queue', "Reset queue!")
        var deletedRecords = await this.#db.knex.table("queue").delete();
        this.#running = false;        
        return deletedRecords;

    }


    async enqueue(cmd, payload) {

        if (!this.#CONTEXT.queueJobs[cmd]) return { error: "No such job function: " + cmd };
        var func = this.#CONTEXT.queueJobs[cmd];

        var context = null;
        if (typeof func.getContext === "function") {
            try {
                context = await func.getContext.apply(func.scope, [this.#tenant, payload]);
                log.debug('Queue', context);
            } catch (e) {
                log.error('Queue', `Get context not working: ${e.toString()}`);
                return {error: `Job 'getContext' has error: ${e.toString()}`};
            }
        }

        // Uniqueness check?
        if(func.uniqueness){            
            var query = this.#db.knex("queue").where("status","waiting").where("cmd",cmd);
            for(var x in func.uniqueness){
                // json string in payload...
                let key = func.uniqueness[x];
                let value = payload[key];                
                query.whereLike("payload",`%"${key}":"${value}"%`);                
            }
            var existing = await query;
            if(existing.length !== 0){
                return {error: "Job already enqueued."};
            }
        }


        var job = await this.#db.table("queue").insert({}, {
            "cmd": cmd,
            "payload": payload || {},
            "context": context || {},
            "status": "waiting"
        });

        var id = job[0];

        // send queue event
        this.#wsh.emit(`queue:${cmd}:${id}:add`, {
            cmd: cmd,
            id: id,
            action: 'add',
            status: "waiting",
            context: context
        })

        this.startQueue();
        return { jobId: id, status: "waiting", context: context };

    }


    #sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), ms);
        })
    }

    // Start queue
    async #run() {

        // fetch the first "waiting" job in the db     
        var jobs = await this.#db.table("queue").fetch({}, { "status": "waiting" }, {limit: 1, sort: [{ field: "__validFrom", direction: "asc" }] });
        if (jobs.length === 0) {
            log.debug("Queue", "No waiting jobs");
            this.#running = false;
            return;
        }

        var job = jobs[0];
        log.debug("Queue", "Run job: "+ job.id);
        await this.#runJob(job);

        // next run...
        this.#run();

    }

    async #runJob(job) {

        var cmd = job.cmd;
        var jobId = job.id;
        var payload = job.payload || {};
        var context = job.context || {};
                
        // sendStatus job per job
        let sendStatus = async (status, topic, subStatus) => {

            if (["waiting", "running", "success", "error"].indexOf(status) === -1) {
                log.error(`Queue`,`Status not allowed ${status}`)
                return;
            }

            var hasChanges = false;
            for(var x in context.installSteps){
                let step = context.installSteps[x];
                if(topic === step.id){
                    log.debug("Queue",`[${jobId}] Set status of '${topic}' to '${subStatus}'`);
                    step.status = subStatus;
                    hasChanges = true;                                    
                }
                if(hasChanges){
                    log.debug("Queue",`[${jobId}] Write update`);
                    await this.#db.table("queue").update({}, jobId, {context: context});
                }
            }
            // send queue event
            this.#wsh.emit(`queue:${cmd}:${job.id}:update`, {
                cmd: cmd,
                id: job.id,
                action: 'update',
                status: status,
                topic: topic,
                subStatus: subStatus,
                context: context
            })
        };

        try {
            await this.#db.table("queue").update({}, job.id, { "status": "running" });
            sendStatus("running", "job", "start");

            //---run registered function--
            if (!this.#CONTEXT.queueJobs[cmd]) throw new Error("No such job function: " + cmd);
            var func = this.#CONTEXT.queueJobs[cmd];

            var scope = func.scope || {};
            var fn = null;
            if (typeof func.onRun === "function") {
                fn = func.onRun;
            } else if (scope[func.onRun]) {
                fn = scope[func.onRun];
            } else {
                throw new Error(`Function of jobFunction '${cmd}' not found?!`);
            }

            
            var success = await fn.apply(func.scope, [this.#tenant, job, payload, context, sendStatus]);

            await this.#db.table("queue").update({}, job.id, { "status": "success", "success": success });
            sendStatus("success");            
            log.debug(`Queue`, "Done job: "+ job.id);
                

        } catch (e) {
            log.error("Queue", `Error job: ${job.id} ${e.toString()}`);
            await this.#db.table("queue").update({}, job.id, { "status": "error", "error": e.toString() });
            sendStatus("error", e.toString());
        }

        return { };


    }


}