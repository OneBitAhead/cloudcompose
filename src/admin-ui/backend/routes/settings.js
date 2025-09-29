const checkBillingAddress = function( value ){

    // Check fields against whitelist
    const field_whitelist = ["name", "vat", "street", "zipcode", "city", "country", "additionalInfo"];
    const hasValueNotInWhitelist = Object.keys(value).some(v => !field_whitelist.includes(v));
    if(hasValueNotInWhitelist === true) return false;

    // Either name or additionalInfo is 
    if( (value.name||'').trim() === '' && (value.additionalInfo||'').trim() === '' ) return false;

    return true;

}



module.exports = function init(CONTEXT) {

    var app = CONTEXT.app;
           
 
    app.get('/api/settings/check/:key', CONTEXT.middleware.needsAnyRole("admin"), async (req, res) => {

        var key = req.params.key;
        var records = await req.tenant.db.table("settings").fetch(req, {"key":key}, {  });
        res.status(200).json({ isDefined: records.length > 0 });
    });

    app.get('/api/settings/:key', CONTEXT.middleware.needsAnyRole("admin"), async (req, res) => {

        var key = req.params.key;
        var records = await req.tenant.db.table("settings").fetch(req, {"key":key}, {  });
        res.status(200).json({ records: records });
    });


    // 
    app.post('/api/settings', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        var key = req.body.key;
        var value = req.body.value;

        if(!['billing_address'].includes(key)) return res.status(400).json({ error: `Unknown setting: ${key}` });

        if(key === 'billing_address') {
            var is_valid = checkBillingAddress(value);
            if(is_valid){
                try {
                    var record = await req.tenant.db.table("settings").upsert(req, {key, value});
                    res.status(201).json({ message: 'Address created' });
                } catch (e) {
                    res.status(400).json({ error: e.toString() });
                }
            } else {
                return res.status(400).json({ error: 'Could not ' });
            }
        }

    });

    app.delete('/api/settings/:key', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        var key = req.params.key;

        // delete 
        try{
            var result = await req.tenant.db.table("settings").deleteWhere({}, {key: key},{eventWithDeletedData: true});
        }catch(e){         
            return res.status(400).json({error: (e.toJSON) ? e.toJSON(): e.toString()})
        }
        res.status(200).json(result);  

    })
}