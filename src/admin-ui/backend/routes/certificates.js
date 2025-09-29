const multer = require("multer");
const fsp = require("node:fs/promises");
const path = require("node:path");


module.exports = function init(CONTEXT) {

    var app = CONTEXT.app;

    // Configure multer to save uploaded files to 'uploads' folder
    const upload = multer({
        dest: "/tmp"
    });
      
    // List users
    app.get('/api/certificates', CONTEXT.middleware.needsAnyRole(["admin", "user"]), async (req, res) => {
        
        var records = await req.tenant.db.table("certificates").fetch(req, {}, { attributes: ["name","expires","domains"]});
        res.status(200).json({ records: records });
    });


    app.post('/api/certificates', CONTEXT.middleware.needsRole("admin"), upload.single('file'), async (req, res) => {



        try {
            // read from file...
            if(!req.file) return res.status(400).json({error:"Please provide a certificate file."});

            var name = req.file.originalname;
            var ending = path.extname(name);
            if(ending !== ".pem") return res.status(400).json({error:"Please provide a *.pem file."});

            var pem = (await fsp.readFile(req.file.path)).toString();          
            await fsp.unlink(req.file.path);  
                        
            var result = await CONTEXT.cpCon.send({ tenantId: "*", "topic": "haproxy", cmd: "addCert", payload: { name: name, pem: pem}});
            if(result.error){
                return res.status(400).json({error: result.error});
            }
            await req.tenant.db.table("certificates").upsert(req, {name: name, certificate: pem, domains: result.domains, expires: result.expires});
            res.status(201).json({msg: "done"});
        } catch (e) {
            res.status(400).json({ error: e.toString() });
        }
    });

    app.delete('/api/certificates/:id', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        try {     
            var cert = await req.tenant.db.table("certificates").fetchById(req, req.params.id);
            if(cert.length === 0) return res.status(400).json({error: "No such cert"});
            // 1) delete from haproxy folder and reload haproxy
            var result = await CONTEXT.cpCon.send({ tenantId: "*", "topic": "haproxy", cmd: "deleteCert", payload: { name: cert[0].name}});
            if(result.error){
                return res.status(400).json({error: result.error});
            }
            // 2) and delete it from db            
            var update = await req.tenant.db.table("certificates").delete(req, req.params.id, { eventWithDeletedData: true });
            res.status(200).json(update);
        } catch (e) {
            log.error("Certificates", e);
            res.status(400).json({ error: e.toJSON() });
        }
    });




};
