module.exports = function init(CONTEXT){

    var app = CONTEXT.app;

    // Blueprints
    app.get('/api/locales/:locale', async(req, res) => {

        var locale = req.params.locale;
        var locales = CONTEXT.LOCALES[locale];
        if(!locales) return res.status(400).json({error:"No such language"+locale});

        res.status(200).json(locales);

    });

    
};
