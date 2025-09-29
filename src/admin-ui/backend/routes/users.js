const Helper = require("./../libs/Helper");

module.exports = function init(CONTEXT) {

    var app = CONTEXT.app;
       

    // List users
    app.get('/api/users', CONTEXT.middleware.needsAnyRole(["admin", "user"]), async (req, res) => {
        var attributes = (Helper.hasRole(req, "admin")) ? ["email", "username", "role"] : ["email", "username"];
        var records = await req.tenant.db.table("users").fetch(req, {}, { attributes: attributes });
        res.status(200).json({ records: records });
    });


    // change language
    app.put('/api/users/:id/switchLocale', CONTEXT.middleware.needsAnyRole("*"), async (req, res) => {

        var locale = req.body.locale;

        // Only your OWN language
        if (req.user.id !== parseInt(req.params.id, 10)) {
            return res.status(400).json({ "error": "You can only change your own language!" });
        }

        try {
            // Update data        
            var update = await req.tenant.db.table("users").update(req, req.params.id, {
                locale: locale
            });
            res.status(200).json(update);
        } catch (e) {
            res.status(400).json({ error: e.toString() });
        }


    });



    app.post('/api/users', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        // user with name "tech_name" is never allowed!
        // this is the user to change data (the client-admin!)
        var validMail = Helper.isEmailValid(req.body.email);
        if (!validMail) return res.status(400).json({ error: "No valid mail" });


        try {
            var pwd = Helper.generateVar({ length: 10, specialChars: "#+!" });
            var record = await req.tenant.db.table("users").insert(req, {
                email: req.body.email,
                username: req.body.username,
                role: req.body.role,
                password: req.tenant.db.createPasswordHash(req.body.email + pwd)
            })
            res.status(201).json({ initialPwd: pwd });
        } catch (e) {
            res.status(400).json({ error: e.toString() });
        }
    });




    app.put('/api/users/:id', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        try {
            // Update data        
            var update = await req.tenant.db.table("users").update(req, req.params.id, {
                username: req.body.username,
                role: req.body.role
            });
            res.status(200).json(update);
        } catch (e) {
            res.status(400).json({ error: e.toString() });
        }

    });


    app.put('/api/users/:id/password', CONTEXT.middleware.needsAnyRole("*"), async (req, res) => {

        var isAdmin = (Helper.hasRole(req, "admin")) ? true : false;
        var userId = parseInt(req.params.id, 10);
        // Check that a normal user can only change own password!
        if (req.user.id !== userId && isAdmin === false) {
            return res.status(400).json({ "error": "You cannot change a password of another user!" });
        }

        try {
            // Update password of user!!
            var query = await req.tenant.db.table("users").fetchById(req, userId);
            var user = query[0];
            if(!user) throw new JsonError("NoSuchUser",{userId: userId});

            var update = await req.tenant.db.table("users").update(req, userId, {
                password: Helper.createPasswordHash(user.email+req.body.password)
            });            
            
            var result = await CONTEXT.cpCon.send({tenantId: req.tenant.id, topic: "users", cmd:"changePassword", payload:{email: user.email, password: req.body.password}});
            log.debug("Keycloak",{result},"Reset user password");           

            res.status(200).json(update);
        } catch (e) {
            res.status(400).json({ error: e.toString() });
        }

    });



    app.delete('/api/users/:id', CONTEXT.middleware.needsRole("admin"), async (req, res) => {

        // Check that one is NOT deleting oneself
        if (req.user.id === parseInt(req.params.id, 10)) {
            return res.status(400).json({ "error": "You cannot delete yourself!" });
        }
        try {
            // Update data        
            var update = await req.tenant.db.table("users").delete(req, req.params.id, { eventWithDeletedData: true });
            res.status(200).json(update);
        } catch (e) {
            log.error("App", e, "User deletion")
            res.status(400).json({ error: e.toJSON() });
        }

    });




};
