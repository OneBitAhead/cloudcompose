module.exports = function init(CONTEXT){

    var app = CONTEXT.app;
 
    // Queue entries
    app.get('/api/queue', CONTEXT.middleware.needsAnyRole("*"),  async(req, res) => {
        
        var records = await req.tenant.db.knex.table("queue").select("*").whereNot("status","success");
        res.status(200).json({ records: records});

    });

    
    app.get('/api/queue/:jobId', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {

        var jobId = req.params.jobId;
        try{                
            var records = await req.tenant.db.table("queue").fetchById(req, jobId);
            if(records.length !== 1) return res.status(404).json({error: "No such job"});
            var installSteps = records[0].context.installSteps || [];
            res.status(200).json({ 
                status: records[0].status, 
                error: records[0].error, 
                steps: installSteps
            });
        }catch(e){
            res.status(400).json({ error: e.toString()});
        }   

    });

       

    // Reset queue
    app.delete('/api/queue', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {
            
        var deletions = await req.tenant.queue.reset();
        res.status(200).json({ deletedRecords: deletions});


    });

    // // Add queue entry
    // app.get('/api/queue/add_sleep', CONTEXT.middleware.needsAnyRole("admin"),  async(req, res) => {
    //     var job = await req.tenant.queue.enqueue("app-install-test", {app: "aa"});
    //     res.status(200).json(job);        
    // });

    
};
