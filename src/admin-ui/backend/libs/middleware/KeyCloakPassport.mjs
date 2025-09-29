import passport from 'passport';
import * as client from 'openid-client'
import { Strategy } from 'openid-client/passport'
import jwt from 'jsonwebtoken';

const KC_URL = `https://${process.env.KC_DOMAIN || "identity.cloudcompose.de"}`;


export default class KeycloakStrategy {

  #CONTEXT;
  #strategies;

  constructor(CONTEXT) {

    this.#CONTEXT = CONTEXT;
    this.#strategies = {};

    // Passport middleware     
    this.#CONTEXT.app.use(passport.initialize());
    this.#CONTEXT.app.use(passport.session());
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    // NOW register middleware (not BEFORE the app.use...)
    // or we do NOT have the correct req.user available!
    // all other middleware....
    this.#registerMiddleware(CONTEXT)


    this.#initRoutes();

  }


  #checkSessionAndTenant(req){
    
    if(!req.user) return false;
    
    // since multi-tenant, the tenant.id in the request AND
    // the session cookie tenant needs to be the same!!!
    if(req.user && (req.tenant.id !== req.user.tenantId)) {
          
      console.log("== existing browser session, but for WRONG tenant ==");
      console.log("--> URL: ", req.tenant.id, " but session for ", req.user.tenantId);
      console.log("-----------------------------------------------------------")
      return false;
    }

    return true;
  }


  async addTenant(tenantId, kc_config) {

    var server = new URL(`${KC_URL}/realms/${kc_config.realm}/.well-known/openid-configuration`);
    var tenantId = kc_config.realm;
    var clientSecret = kc_config.clientSecret;
    var scope = 'openid email';
    var callbackURL = `https://${tenantId}.${BASE_DOMAIN}/auth/callback`;
    let config = await client.discovery(server, "cc-admin-ui", clientSecret);
    let options = {
      config,
      scope,
      callbackURL,
      passReqToCallback: true
    }

    // OIDC Strategy
    let name = "oidc_" + tenantId;
    this.#strategies[name] = new Strategy(options, this.#verify);
    passport.use(name, this.#strategies[name]);

  }

   async syncClientsWithKeycloak(tenant) {
    
        log.info("Keycloak", "Sync keycloak clients (with existing apps)");
        var existingApps = await tenant.db.table("apps").fetch({}, {}, { attributes: ["project"] });
        var clientIds = [];
        for (var x in existingApps) {
            clientIds.push(existingApps[x].project);
        }
        console.log("send: kc:clients, cmd: sync")
        console.log(clientIds);
        var result = await this.#CONTEXT.cpCon.send({ tenantId: tenant.id, topic: "kc:clients", cmd: "sync", payload: { clientIds: clientIds } });
        log.debug("Keycloak", { result }, `Keycloak sync result`);

    }



  #initRoutes() {

    var app = this.#CONTEXT.app;

    app.get('/login', (req, res, next) => {
      let strategy = 'oidc_' + req.tenant.id;
      console.log("login_strategy: ", strategy);
      if (!this.#strategies[strategy]) return res.status(400).send('Strategy not specified');
      passport.authenticate(strategy)(req, res, next);
    });

    // Logout
    app.get('/logout', (req, res) => {

      console.log("tenantId:", req.tenant.id);
      try {

        var user = req.session?.passport?.user || {};
        const idTokenHint = user.id_token;
        var sessionId = req.sessionID;
        var callbackURL = `https://${req.tenant.id}.${BASE_DOMAIN}/auth/callback`;


        // 1. destroy session!
        req.session.destroy((err) => {
          if (err) return next(err);

          // Send message to proxy (cache)
          this.#CONTEXT.functions.deleteSessionFromCache(sessionId);

          var keycloakLogoutUrl = '';
          if(idTokenHint){
            // Logout from keycloak!
            keycloakLogoutUrl = `${KC_URL}/realms/${req.tenant.id}/protocol/openid-connect/logout?id_token_hint=${idTokenHint}&post_logout_redirect_uri=${encodeURIComponent(callbackURL)}`;
          } else {
            keycloakLogoutUrl = `${KC_URL}/realms/${req.tenant.id}/protocol/openid-connect/logout`;
          }
          res.redirect(keycloakLogoutUrl);

        });//end-of-destroy
      } catch (e) {
        log.error("Auth", e, "Logout-Error:");
        res.send("Logout not possible: " + e.toString())
      }
    });



    // Auth check route
    app.get('/api/loggedIn', async (req, res) => {

      //console.log("/api/loggedIn:", req.tenant.id, req.user.tenantId);

      if (req.user) {

        if(this.#checkSessionAndTenant(req) === false){
          return res.status(401).json({ error: 'Not authenticated', goTo: `https://${req.user.tenantId}.${process.env.BASE_DOMAIN}/wrongSession` });
        }
        
        // fetch user from db!
        var users = await req.tenant.db.tables("users").fetch(req, { email: req.user.email });
        if (users.length !== 1) {
          console.log("ERROR: No user found in db or create it?!");
          return res.status(401).json({ error: 'Not such user found in db' });
        }

        var user = users[0];

        return res.json({
          id: user.id,
          email: req.user.email,
          username: req.user.username,
          roles: req.user.APP_ROLES,
          isAdmin: (req.user.APP_ROLES?.indexOf("admin") !== -1) ? true : false,
          locale: user.locale,
          // available languages
          locales: this.#CONTEXT.LOCALES_LIST
        });
      }

      //res.status(401).json({ error: 'Not authenticated' });
      res.status(401).json({ error: 'Not authenticated', goTo: "/login" });
    });


    app.get('/auth/callback', (req, res, next) => {


      let strategy = 'oidc_' + req.tenant.id;

      passport.authenticate(strategy, (err, user, info) => {

        console.log("auth/callback/", err, user, info);


        if (err) {
          // ✅ Log and customize the error response
          log.error("Auth", err, 'OIDC error:');
          return res.status(401).json({
            status: 'error',
            message: err.message || 'Authentication error',
            type: err.name,
            oauth: err.oauthError || null // useful for ResponseBodyError
          });
        }

        if (!user) {
          // ⚠️ No user was returned — login failed
          return res.status(401).json({
            status: 'fail',
            message: info?.message || 'Login failed'
          });
        }

        // ✅ Login successful
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            log.error("Auth", loginErr, 'Login session error:');
            return res.status(500).json({ message: 'Session login failed' });
          }

          // Send message to proxy (cache)
          // to read initial keycloak rights!
          this.#CONTEXT.functions.initSessionFromCache(req.sessionID);

          // 🎉 Redirect or respond
          return res.redirect('/');
        });
      })(req, res, next);
    });

  }


  async #verify(req, tokenSet, done) {


    try {
      // decode the needed data!
      const decoded = jwt.decode(tokenSet.access_token);
      const resource_access = decoded?.resource_access;
      const claims = tokenSet.claims();

      const user = {
        tenantId: req.tenant.id,
        email: claims.email,
        preferred_username: claims.preferred_username,
        id_token: tokenSet.id_token,
        permissions: {},
      };

      log.debug(`Keycloak`, { resource_access }, "Resource_Access:");

      // Add permissions of apps
      for (var x in resource_access) {
        if (!x.startsWith("cc-app-")) continue;
        user.permissions[x] = resource_access[x].roles;
      }

      try {
        user.APP_ROLES = resource_access["cc-admin-ui"].roles;
      } catch (e) {
        user.APP_ROLES = [];
      }

      // check data from database too!
      var userRecord = await req.tenant.db.tables("users").fetch({}, { email: user.email });
      if (userRecord.length !== 1) {
        return done("User not in AdminUI database: " + user.username);
      }

      // store userId (from database record)
      user.id = userRecord[0].id;
      user.locale = userRecord[0].locale || "en";
      user.username = userRecord[0].username;
      
      console.log("verify:", user);

      log.debug("Auth", user, "User from keycloak to session:");

      done(null, user)
    } catch (e) {
      log.error("Auth", e, "OIDC error:");
      done("Parse response from keycoak with error: " + e.toString())
    }


  }

  #registerMiddleware() {

    var app = this.#CONTEXT.app;

    // Middleware: enforce login
    this.#CONTEXT.middleware.ensureLoggedIn = function (req, res, next) {

      if (req.isAuthenticated() && this.#checkSessionAndTenant(req) !== false) {
        //console.log(req.url, "roles: ", req.user.APP_ROLES);  
        return next();
      }
      console.log("not authenticated...")
      res.redirect('/login');
    };

    // Middleware to check the ROLE of the user
    this.#CONTEXT.middleware.needsRole = (role) => {

      return (req, res, next) => {
        var access = false;
        var APP_ROLES = req?.user?.APP_ROLES || [];

        if (APP_ROLES.indexOf(role) !== -1) access = true;

        if (access === false) {
          // API call: JSON-Fehlermessage zurückgeben
          if (req.url.substring(0, "/api".length) === "/api") {
            log.debug("Auth", `No '${role}' access: ${req.url}`)
            return res.status(403).json({ error: `no '${role}' access` });
          }
          return res.send(`no '${role}' access`);
        }
        next();
      }
    };

    this.#CONTEXT.middleware.needsAnyRole = (roles) => {

      if (!roles || roles === "*") roles = "*";
      else roles = [].concat(roles);

      return (req, res, next) => {

        var access = false;

        var APP_ROLES = req?.user?.APP_ROLES || [];
        if (APP_ROLES.length === 0) {
          // API call: JSON-Fehlermessage zurückgeben
          if (req.url.substring(0, "/api".length) === "/api") {
            log.debug(`[${req?.user?.email}] You don't have any role. No access to ${req.url}`)
            return res.status(403).json({ error: `You don't have any role -> no access` });
          }
          return res.send(`You don't have any role -> no access`);
        }

        if (roles === "*") access = true;
        else {
          for (var x in APP_ROLES) {
            if (roles.indexOf(APP_ROLES[x]) !== -1) access = true;
          }
        }

        if (access === false) {
          // API call: JSON-Fehlermessage zurückgeben
          if (req.url.substring(0, "/api".length) === "/api") {
            log.debug(`Auth`, `[${req?.user.email}] You need at least one role out of '${roles.join(",")}' for access to ${req.url}`)
            return res.status(403).json({ error: `no role -> no access` });
          }
          return res.send(`no role - no access`);
        }
        next();
      }
    };

  }

}