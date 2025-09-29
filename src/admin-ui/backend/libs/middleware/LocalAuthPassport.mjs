import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { pThrottle } from "../Throttle.js";
import path from 'node:path';
import fs from 'node:fs';

const __dirname = import.meta.dirname;


export default class LocalAuthStrategy {

  #CONTEXT;
  #authThrottle;
  #checkAuthThrottle;
  #strategies;

  constructor(CONTEXT) {

    this.#CONTEXT = CONTEXT;
    this.#strategies = {};
   
    // Passport middleware     
    this.#CONTEXT.app.use(passport.initialize());
    this.#CONTEXT.app.use(passport.session());

    passport.deserializeUser((user, done) => { done(null, user) });
    passport.serializeUser((user, done) => { done(null, user) });


    this.#initAuthThrottle();
    // NOW register middleware (not BEFORE the app.use...)
    // or we do NOT have the correct req.user available!
    // all other middleware....
    this.#registerMiddleware(CONTEXT);
    this.#initRoutes();

  }


  #initAuthThrottle(){

    var limitFromEnv = parseInt(process.env.AUTH_REQUEST_LIMIT_PER_SECOND,10);
    if(isNaN(limitFromEnv) || limitFromEnv < 10) limitFromEnv = false;

    let throttleOptions = {
        id: "http_in",
        limit: limitFromEnv || 10,
        interval: 1000,
        type: "strict",
        maxQueueSize: 100
    }

    log.debug("Auth", throttleOptions, "Default throttle options");
    
    this.#authThrottle = new pThrottle(throttleOptions);
    // the request are throttled (and enqueued in the throttle object)
    // until the QUEUE is full
    this.#authThrottle.on("throttled", () => {
      log.debug("Auth", `RequestIn: Throttled!`);
    })
    // if the queue is full, the request gets an immediate response 429 Too Many Requests
    this.#authThrottle.on("ExceedMaxQueueSize", () => {
      log.debug("Auth", `Queue full...send a 429 Too Many Requests`);
    })

    this.#checkAuthThrottle = async(req, res, next) => {        
      try {          
          await this.#authThrottle.throttle();
      } catch (e) {        
        log.info("Auth", `Too many requests`)
        return res.status(429).send("Too Many Requests");
      }      
      setTimeout(next, 1);
    }     


  }



  #checkSessionAndTenant(req) {

    if (!req.user) return false;
    // since multi-tenant, the tenant.id in the request AND
    // the session cookie tenant needs to be the same!!!
    if (req.user && (req.tenant.id !== req.user.tenantId)) {
      log.error("App", `Existing browser session for '${req.user.tenantId}' but request for ${req.tenant.id}`);
      return false;
    }
    return true;
  }


  async addTenant(tenantId) {

    // Local Auth Strategy
    let name = "local_" + tenantId;
    this.#strategies[name] = new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      session: true,
      passReqToCallback: true
    }, this.#verify.bind(this));
    log.info("Auth", `Local strategy for tenant ${tenantId} registered`)
    passport.use(name, this.#strategies[name]);

  }


  #returnDelayedLoginError(res, delay, status, errorMsg){

    setTimeout(()=>{
      log.debug("Auth",`Return auth error: ${status} ${errorMsg}`)
      res.status(status).json({error:errorMsg})
    },delay);

  }


  #initRoutes() {

    var app = this.#CONTEXT.app;
    
    // read it once ...
    const loginHtmlBuffer = fs.readFileSync(path.join(__dirname, '../../staticPages', 'login.html'));
    // and return it
    app.get('/login', this.#checkAuthThrottle, (req, res) => {      
      res.set('Content-Type', 'text/html');
      res.send(loginHtmlBuffer);  
    });


    app.post('/login', this.#checkAuthThrottle, (req, res, next) => {
      let strategy = 'local_' + req.tenant.id;
      if (!this.#strategies[strategy]) return res.status(400).send('Strategy not specified');

      passport.authenticate(strategy, (err, user, info) => {
        if (err) {
          return this.#returnDelayedLoginError(res, 1000, 500, 'Internal error');
        }
        if (!user) {
          return this.#returnDelayedLoginError(res, 1000, 403, 'Wrong credentials');          
        }
        // store in session!
        req.login(user, (err) => {
          if (err) return this.#returnDelayedLoginError(res, 1000, 403, err.toString());
          return res.status(200).json({ goTo: "/" });          
        })

      })(req, res, next);
    });

    // Logout
    app.get('/logout', this.#checkAuthThrottle, (req, res) => {

      try {
        // 1. destroy session!
        req.session.destroy((err) => {
          if (err) return next(err);
          res.redirect("/");

        });//end-of-destroy
      } catch (e) {
        log.error("Auth", e, "Logout-Error:");
        res.send("Logout not possible: " + e.toString())
      }
    });
    


    // Auth check route PUBLIC AVAILABLE!
    app.get('/api/loggedIn', this.#checkAuthThrottle, async (req, res) => {
      
      if (req.user) {
        if (this.#checkSessionAndTenant(req) === false) {
          return res.status(401).json({ error: 'Not authenticated', goTo: `https://${req.user.tenantId}.${req.tenant.baseDomain}/wrongSession` });
        }
        // fetch user from db!
        var users = await req.tenant.db.tables("users").fetch(req, { email: req.user.email });
        if (users.length !== 1) {
          log.error("Auth", `No user found in db for '${req.user.email}'`);
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

      // Wait for 500ms to return the answer
      setTimeout(()=>{
        log.error("Auth", `Not authenticated -> cookie: ${req.headers.cookie}`)
        res.status(401).json({ error: 'Not authenticated', goTo: "/login" });
      },500)
      
    });


  }

  async #verify(req, username, password, done) {

    try {
      var user = await req.tenant.db.table("users").fetch({}, { email: username, password: password })
      if (user.length === 1) {

        var userObject = {
          id: user[0].id,
          username: user[0].username,
          email: user[0].email,
          tenantId: req.tenant.id,
          APP_ROLES: [user[0].role],
          permissions: {}
        }

        // Get permissions of user!      
        var permissions = await req.tenant.db.table("permissions").fetch({}, { user: user[0].id }, {attributes: ["id","app.project","roles"], withRelations: true})
        // Add permissions of apps
        for (var x in permissions) {          
          let perm = permissions[x];  
          userObject.permissions[perm.app.project] = (!perm.role) ? 'user': perm.roles;
        }        

        return done(null, userObject);
      } else {
        return done(null, false, { message: 'Username/Password wrong' });
      }
    } catch (err) {
      return done(err);
    }
  }


  #registerMiddleware() {

    var app = this.#CONTEXT.app;

    // Middleware: enforce login
    this.#CONTEXT.middleware.ensureLoggedIn = function (req, res, next) {

      if (req.isAuthenticated() && this.#checkSessionAndTenant(req) !== false) {
        log.debug("Auth", `${req.url}: Roles ${req.user.APP_ROLES}`);
        return next();
      }
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