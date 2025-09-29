module.exports = function init(CONTEXT) {

    var app = CONTEXT.app;
           
    
    // List invoices
    app.get('/api/invoices', CONTEXT.middleware.needsAnyRole("admin"), async (req, res) => {
        var records = await req.tenant.db.table("invoices").fetch(req, {}, {  });
        res.status(200).json({ records: records });
    });

}