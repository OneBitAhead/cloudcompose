// process name
process.title = "{node} cc-proxy"
// nodejs internals
const http = require("node:http");
const https = require("node:https");
const cluster = require('node:cluster');
const net = require('node:net');
const fsp = require(`node:fs/promises`);
const path = require("node:path");
const randomUUID = require('node:crypto').randomUUID;
// npm libraries
const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
// own stuff
const { pThrottle } = require("./../libs/Throttle");
const PermissionCache = require("./PermissionCache");
const { ProcessConnector } = require("../libs/connectors/ProcessConnector");
const Tenant = require("./Tenant");
const Helper = require("./../libs/Helper");

require("./../libs/ErrorHandling")


// Logging
let GLOBAL_LOG_LEVEL = (process.env.LOG_LEVEL && process.env.LOG_LEVEL !== "") ? process.env.LOG_LEVEL : "info";
require("./../libs/Logging")(GLOBAL_LOG_LEVEL);
//log.setLevel("WebSocket", "info");
//log.setLevel("Proxy", "info");
//log.setLevel("Auth", "info");
//log.setLevel("Auth-Exceptions", "info");
//log.setLevel("PermissionCache", "debug");

class ClusterManagement {

  #config;
  #testMode;
  #tenants;
  // Workers (processes) and their message queues
  #workers;
  #messageQueues;
  // --------------
  #throttles;
  // cluster graceful stop...
  #stopping;
  // id of main process (can be used as "server instance id" 
  // e.g. for pubsub to know if the event was send from this server or not!)
  #mainPID;
  #endpoints;
  #KC_DOMAIN;
  #cache;
  #staticPages;

  // MODE: INSTALL|LIVE
  #MODE;

  constructor() { }

  /**
   * Init the CLUSTER
   *
   *
   *
   * @param {*} config
   */
  async init() {

    this.#messageQueues = {};
    this.#tenants = {};
    this.#throttles = {};
    this.#workers = {};
    this.#endpoints = {};
    this.#config = {
      port: 5001
    }

    this.#MODE = "live";

    // Setup main process!
    cluster.setupPrimary({
      silent: true
    });

    await this.#startAdminUI();
    // init the http proxy
    await this.#initProxy();

    
    // read it once (staticPages)
    this.#staticPages = {};

    // read it once
    this.#staticPages["notFoundHtmlBuffer"] = await fsp.readFile(path.join(__dirname, './../staticPages', '404.html'));
    this.#staticPages["noRightsHtmlBuffer"] = await fsp.readFile(path.join(__dirname, './../staticPages', 'noRightsForApp.html'));

    this.#KC_DOMAIN = process.env.KC_DOMAIN || "identity.cloudcompose.de";

  }

  get MODE() {
    return this.#MODE;
  }


  get db() {
    return this
  }


  /**** THROTTLES *****************/
  async #checkThrottle(req, res, next) {
    if (this.#throttles[req.tenantId]) {
      try {
        await this.#throttles[req.tenantId].throttle();
      } catch (e) {
        log.info("Throttle", `Too many requests for tenant ${req.tenantId}`)
        return res.status(429).send("Too Many Requests");
      }
      setTimeout(next, 1);
    }
  }

  #setThrottle(tenantId, options = {}) {


    var limitFromEnv = parseInt(process.env.REQUEST_LIMIT_PER_SECOND, 10);
    if (isNaN(limitFromEnv) || limitFromEnv < 100) limitFromEnv = false;

    let throttleOptions = {
      id: "http_in",
      limit: options.limit || limitFromEnv || 100,
      interval: options.interval || 1000,
      type: options.type || "strict",
      maxQueueSize: options.maxQueueSize || 100
    }

    log.debug("Proxy", throttleOptions, "Default throttle options");

    // if throttle was set before ...
    if (this.#throttles[tenantId] !== undefined) {
      // delete and renew...
      this.#throttles[tenantId].removeAllListeners();
      delete this.#throttles[tenantId];
    }

    this.#throttles[tenantId] = new pThrottle(throttleOptions);
    // the request are throttled (and enqueued in the throttle object)
    // until the QUEUE is full
    this.#throttles[tenantId].on("throttled", () => {
      log.debug("Proxy", `RequestIn: Throttled on the ${tenantId}`);
    })
    // if the queue is full, the request gets an immediate response 429 Too Many Requests
    this.#throttles[tenantId].on("ExceedMaxQueueSize", () => {
      log.debug("Proxy", `Queue full...send a 429 Too Many Requests to ${tenantId}`);
    })
  }


  /**
     * Setup the primary process
     *
     *
     *
     * @param {*} config
     */
  async #startAdminUI() {

    this.#spawnChildProcess("AdminUI", {
      port: 4000,
      withRespawn: (this.#testMode === true) ? false : true,
    });

  }

  getSessionIdFromCookie(req) {

    var cookieParts = req.headers.cookie.split('; ');
    var cookies = {};
    for (var x in cookieParts) {
      var s = cookieParts[x].split("=");
      cookies[s[0]] = decodeURI(s[1]);
    }
    let sessionId = cookies["cloudcompose"] || '';
    // only take the first part of the key (part until the ".")
    sessionId = sessionId.substr(0, sessionId.indexOf("."));
    sessionId = sessionId.substr(sessionId.indexOf("s%3A") + 4);
    return sessionId;
  }


  async getUserByCookie(req) {

    if (!req.headers.cookie) return false;
    var sessionId = this.getSessionIdFromCookie(req);
    if (!sessionId) return false;
    // add user (from session) to req (here NO passport is used)                 
    return await this.#cache.getSession(sessionId);

  }



  // Basic auth middleware
  async #checkAuthMethod(req, res, next) {

    let endpoint = req._endpoint;
    let host = req._host;
    let AUTH_METHOD = endpoint.default_auth_method;

    // 1) AUTH_EXCEPTION_URLS
    if (endpoint.auth_exception_urls) {
      // TODO: improve by prepared regex!
      for (var x in endpoint.auth_exception_urls) {
        if (req.originalUrl.startsWith(endpoint.auth_exception_urls[x])) {
          log.debug("Auth-Exceptions", `[${endpoint.app}] Match with 'auth_exception_urls': ${req.originalUrl}`);
          return next();
        }
      }
    }

    // 2a) auth_method_config tells routing by header?
    if (endpoint.auth_method_config && endpoint.auth_method_config.byHeader) {
      for (var header in endpoint.auth_method_config.byHeader) {
        let e = endpoint.auth_method_config.byHeader[header];
        const matches = e.regex.test(req.headers[header] || '');
        if (matches === true) {
          log.info("Auth", `Switch from ${AUTH_METHOD} to ${e.auth_method} by header ${header}`);
          AUTH_METHOD = e.auth_method;
        }
      }
    }
    // 2b) auth_method config tells routing by URL
    if (endpoint.auth_method_config && endpoint.auth_method_config.byURL) {

      for (var x in endpoint.auth_method_config.byURL) {
        let e = endpoint.auth_method_config.byURL[x];        
        const matches = e.regex.test(req.originalUrl || '');
        if (matches === true) {
          log.info("Auth", `Switch from ${AUTH_METHOD} to ${e.auth_method} by URL regex: ${e.pattern}`);
          AUTH_METHOD = e.auth_method;
        }
      }
    }

    //#################################
    // BASIC AUTH (in proxy)
    //##################################
    if (AUTH_METHOD === "basic-auth") {

      log.debug("Auth", `[${endpoint.app}] Auth method 'basic-auth': ${req.originalUrl}`);

      const auth = req.headers['authorization'];
      if (!auth) {
        res.set('WWW-Authenticate', 'Basic realm="CloudCompose"');
        return res.status(401).send('Authentication required');
      }
      // Parse credentials
      const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
      let email = credentials[0];
      let password = credentials[1];

      // check for user in basic-auth-cache (set the user as object in the request)
      // e.g. for setting headers later from the user object
      req._user = await this.#cache.identifyUserByBasicAuth(req.tenant, email, password);

      if (req._user !== false) {

        var rights = await this.#cache.getUserRights(req.tenantId, { email: email }, endpoint.app)
        if (rights && rights.length > 0) {
          // has rights           
          return next();
        } else {
          log.debug("Auth", `[${endpoint.app}] User has correct basic-auth credentials but not rights.`);
          return res.status(401).send(`Correct credentials but no rights for this app '${endpoint.app}'`);
        }
      }
      // not correct password
      res.set('WWW-Authenticate', 'Basic realm="CloudCompose"');
      return res.status(401).send('Access denied');

    }
    //#################################
    // GENERIC KEYCLOAK AUTH (in proxy)
    // 
    // > if the user is not logged in
    // > the user is send to the generic keycloak login 
    //##################################
    else if (AUTH_METHOD === "cookie") {

      log.debug("Auth", `[${endpoint.app}] Auth method 'cookie': ${req.originalUrl}`);

      if (req.headers.cookie) {
        var sessionId = this.getSessionIdFromCookie(req);
        if (sessionId) {
          // CHECK CACHE
          var rights = await this.#cache.getUserRights(req.tenantId, { sessionId: sessionId }, endpoint.app)
          // if any: go on:
          if (rights && rights.length > 0) {
            // add user (from session) to req (here NO passport is used)                 
            req._user = await this.#cache.getSession(sessionId);
            return next();
          } else if (Array.isArray(rights) && rights.length === 0) {
            log.debug("Auth", `[${endpoint.app}] User has a session but not rights.`);

            var body = structuredClone(this.#staticPages["noRightsHtmlBuffer"].toString());         
            body = Helper.prepareTemplate(body, {BASE_URL: `https://${req.tenantId}.${req.tenant.baseDomain}`});                   
                  
            res.set('Content-Type', 'text/html');
            return res.status(400).send(body);              
                               
          } else if (rights === false) {
            log.warn("Auth", `[${endpoint.app}] User has no session for the given cookie id.`);
            // will go on ---> with login
          }
        }
      }

      // no cookie/session -- or empty and no user in it 
      if (req.tenant.useKeycloak === false) {

        return res.redirect(`https://${req.tenantId}.${req.tenant.baseDomain}/login`);

      } else {
        //return res.status(404).send(`Got target but needs login :) `);
        //return res.redirect('https://identity.cloudcompose.de');
        const keycloakHost = `https://${this.#KC_DOMAIN}`;
        const redirectUri = encodeURIComponent(`https://${req.tenantId}.${req.tenant.baseDomain}?app=https://${host}`);
        const state = randomUUID();
        const nonce = randomUUID();

        const loginUrl = `${keycloakHost}/realms/${req.tenantId}/protocol/openid-connect/auth` +
          `?client_id=cc-admin-ui` +
          `&redirect_uri=${redirectUri}` +
          `&response_type=code` +
          `&scope=openid` +
          `&state=${state}` +
          `&nonce=${nonce}`;

        log.debug("Auth", `[${endpoint.app}] Redirect to keycloak login (req: ${req.originalUrl})`);
        return res.redirect(loginUrl);
      }


    } else if (AUTH_METHOD === "built-in") {
      log.debug("Auth", `[${endpoint.app}] Auth method 'built-in': ${req.originalUrl}`);
    } else if (AUTH_METHOD === "none") {
      log.debug("Auth", `[${endpoint.app}] Auth method 'none': ${req.originalUrl}`);
    } else {
      log.error("Auth", `[${endpoint.app}] No default_auth_method defined. App request will be blocked: ${req.originalUrl}`);
      return res.status(400).send(`<h4>There is no defined auth method defined for the app: <a href="https://${req.tenantId}.${req.tenant.baseDomain}">Back to Portal</a>`);
    }

    next();

  }


  /**
   * We need to be able for the postinstall process to
   * 1) load in an iframe
   * 2) use NO cache
   * 
   */
  #setInjectResponseHeaders(req, res) {

    // iframe stuff
    res.setHeader(`Content-Security-Policy`, `frame-ancestors 'self' https://${req.tenant.id}.${req.tenant.baseDomain}`);
    res.setHeader('Access-Control-Allow-Origin', `https://${req.tenant.id}.${req.tenant.baseDomain}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // allow to get throug cookie based AUTH in iframe situations!
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // ...and NO caching, since there are local_app_passwords which can change from one install to the other!!!
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    log.debug("Injection", `Set injection headers for '${req.originalUrl}'`);


  }



  async #initProxy() {

    var config = this.#config;
    var port = (config.port) ? config.port : 80;


    // ROUTER APP 
    const app = express();

    // Do not show "Express" in response headers!!!
    app.disable('x-powered-by');
    // etags are OFF by default!!
    app.disable("etag");

    this.logProvider = {
      log: (...args) => {
        log.info.apply(log, ["Proxy"].concat(args));
      },
      debug: (...args) => {
        log.debug.apply(log, ["Proxy"].concat(args));
      },
      info: (...args) => {
        // since the info is called every time when routed! --> use "debug"
        log.debug.apply(log, ["Proxy"].concat(args));
      },
      warn: (...args) => {
        log.warn.apply(log, ["Proxy"].concat(args));
      },
      error: (error) => {

        try {
          // Ignore WebSocker ECONNRESET error....
          // everytime a client refreshes the browser...this happens...so stay cool!!!
          if (error.indexOf("[HPM] WebSocket error: Error: read ECONNRESET") !== -1) {
            Metrics.metrics.customMetrics["sci_proxy_errors_econnreset"].inc({ type: "ws" });
            return;
          }
          // HTTP Socket hang up (client connection was disconnected...)
          if (error.indexOf("[HPM] ECONNRESET: Error: socket hang up") !== -1) {
            Metrics.metrics.customMetrics["sci_proxy_errors_econnreset"].inc({ type: "http" });
            return;
          }
        } catch (e) {
          log.error("App", e);
        }
        log.error("Proxy", null, error);
      }
    };


    // === STREAMING PROXY ===
    // 
    // This proxy streams request/response (no buffering, etc..)
    //
    const proxy = createProxyMiddleware({
      logger: this.logProvider,
      logLevel: "verbose",
      ignorePath: true,
      router: (req) => {
        // Target was set before (step 1 in routing)
        if (req._proxyTarget) log.debug("Proxy", ` ⚪ Route to ${req._proxyTarget.split("?")[0]}`)
        return req._proxyTarget;
      },
      on: {
        proxyReq: (proxyReq, req, res) => {
          // check needed auth headers for the endpoint
          this.#checkAuthHeaders(proxyReq, req);
        },
        proxyRes: (proxyRes, req, res) => {
          //delete proxyRes.headers['x-removed']; // remove header from response                           
          var status = (proxyRes.statusCode >= 200 && proxyRes.statusCode < 400) ? '🟢' : '🔴';
          log.debug("Proxy", ` ${status} Return from ${req._proxyTarget.split("?")[0]}`)
          if (req.url !== "/healthCheck") { }
        },
        error: (err, req, resOrSocket) => {
          if (err.code === 'ECONNRESET') {
            log.error('Proxy', err, `Proxy: ${err.code} on ${req.url}`);
          } else {
            log.error('Proxy', err, `Proxy: ${err.code} on ${req.url}`);
          }
          if (resOrSocket && typeof resOrSocket.end === 'function') resOrSocket.end();
        }
      },
      ws: false
    });

    // === INTERCEPTION PROXY ===
    //
    // This proxy is used for any INJECTION urls...
    // The answer from the app is received and can be altered!
    //
    const interceptionProxy = createProxyMiddleware({
      logger: this.logProvider,
      //logLevel: "verbose",
      ignorePath: true,
      selfHandleResponse: true,
      router: (req) => {
        // Target was set before (step 1 in routing)
        if (req._proxyTarget) log.debug("Proxy", ` ⚪ Route to ${req._proxyTarget.split("?")[0]}`)
        return req._proxyTarget;
      },
      on: {

        proxyReq: (proxyReq, req, res) => {
          // check needed auth headers for the endpoint
          this.#checkAuthHeaders(proxyReq, req);
        },

        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
          //delete proxyRes.headers['x-removed']; // remove header from response
          var status = (proxyRes.statusCode >= 200 && proxyRes.statusCode < 400) ? '🟢' : '🔴';
          log.debug("Proxy", ` ${status} Return (intercepted) from ${req._proxyTarget.split("?")[0]}`);

          // check for injections                           
          if (req._endpoint.code_injection_urls) {
            // run through entries
            for (var x in req._endpoint.code_injection_urls) {
              let injection = req._endpoint.code_injection_urls[x];

              var matches = false;
              for (var y in injection.patterns) {
                let match = injection.patterns[y].test(req.originalUrl || '');
                if (match) matches = true;
              }

              if (matches) {

                var body = responseBuffer.toString('utf8');
                var pos = body.indexOf(injection.replaceString);

                if (pos !== -1) {
                  // replace any variables in the string....!
                  let code = injection.code;
                  // Load positinstallInjectScript
                  var injectScript = (await fsp.readFile(__dirname + "/postinstallInjectScript.js")).toString();

                  // if the built-in auth is used....the user is not added to the req
                  // but we can try to get it via cookie instead for the injection...
                  if (!req._user) {
                    req._user = await this.getUserByCookie(req);
                    if (req._user === false) {
                      log.error("App", `Cannot inject scripts without logged in admin user? No cookie? Body of '${req.originalUrl}' of app '${req._endpoint.app}' is unchanged!`);
                      return body;
                    }
                  }

                  var local_app_password = await this.#cache.getLocalAppPassword(req.tenantId, req._user.id, req._endpoint.app);

                  // replacements (if needed) 
                  var parameters = { email: req._user.email, username: req._user.username, userId: req._user.id, password: local_app_password };
                  for (var x in req._endpoint.generated_vars) {
                    parameters[x] = req._endpoint.generated_vars[x];
                  }

                  // Add inject script
                  parameters.injectScript = injectScript;
                  code = Helper.prepareTemplate(code, parameters);
                  body = body.replace(injection.replaceString, code);
                  if(injection.removeCSPMetaTag === true) body = body.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
                  log.debug("Code-Injection", `[${req._endpoint.tech_name}] Injected code in '${req.originalUrl}' for string '${injection.replaceString}'`);

                  // Also set headers for NO caching and CRP and CORS for iframe loading
                  this.#setInjectResponseHeaders(req, res);
               

                }

              

                return body;
              }
            }//end-for-injections
          }
          // Modify/intercept here as needed
          return responseBuffer;
        }),
        error: (err, req, resOrSocket) => {
          if (err.code === 'ECONNRESET') {
            log.error('Proxy', err, `Interception-Proxy: ${err.code} on ${req.url}`);
          } else {
            log.error('Proxy', err, `Interception-Proxy: ${err.code} on ${req.url}`);
          }
          if (resOrSocket && typeof resOrSocket.end === 'function') resOrSocket.end();
        }
      },
      ws: false
    });



    // start the cluster listener (with throttle) "/{*splat}" vs "*"
    app.use(
      // #### global throttle (before everything else is called)
      //###########################
      // 1) check the proxy target
      (req, res, next) => {

        // Search for target
        var URL = req.originalUrl || "";
        var HOST = req.hostname;

        // let Installer module dispatch the calls!
        if (this.#MODE === "install") {
          let endpoint = { target: "http://localhost:5002" };
          req._endpoint = endpoint;
          req._host = req.hostname;
          if (URL === "/") URL = "/install";
          req._proxyTarget = `${endpoint.target}${URL}`;
          return proxy(req, res, next);
        }

        if (this.#endpoints[HOST]) {
          req._endpoint = this.#endpoints[HOST];
          req._host = req.hostname;
          req._proxyTarget = `${this.#endpoints[HOST].target}${URL}`;

          // get tenant id (last part of subdomain...separated by "-") (e.g. uptime-kuma-testkunde1.cloudcompose.de) => testkunde1
          let subdomainParts = (req._host.split(".")[0]).split("-");
          req.tenantId = subdomainParts[subdomainParts.length - 1];
          req.tenant = this.#tenants[req.tenantId];

          next();
        } else {

          log.warn("App", `No matching backend for --> HOST: ${HOST} --> URL: ${URL}`);
          res.status(404);
          res.set('Content-Type', 'text/html');
          
          res.send(this.#staticPages["notFoundHtmlBuffer"]);

        }
      },
      // 2) check potential throttles for the tenant
      this.#checkThrottle.bind(this),
      // 3) check AUTH options (if the app behind the proxy is not
      //    secured by Keycloak / LDAP
      this.#checkAuthMethod.bind(this),
      // finally proxy it
      (req, res, next) => {

        // if injections are there...       
        if (req._endpoint.code_injection_patterns) {
          for (var x in req._endpoint.code_injection_patterns) {
            if (req._endpoint.code_injection_patterns[x].test(req.originalUrl) !== false) {
              return interceptionProxy(req, res, next);
            }
          }
        }
        // Otherwise, default proxy
        return proxy(req, res, next);
      });

    // else start the http-endpoint
    var server = http.createServer(app).listen(this.#config.port, () => {
      log.info("Proxy", null, `(HTTP) CLUSTER API endpoint is listening on: http://0.0.0.0:${port}`);      
    });


    const wsProxy = createProxyMiddleware({
      logger: this.logProvider,
      //logLevel: "verbose",
      ignorePath: true,
      selfHandleResponse: true,
      ws: true,
      router: (req) => {
        log.debug("WebSocket", `WS Routing to ${req._proxyTarget}`);
        // Target was set before (step 1 in routing)
        if (req._proxyTarget) log.debug("Proxy", ` ⚪ Route to ${req._proxyTarget.split("?")[0]}`)
        return req._proxyTarget;
      }

    })

    // web sockets ?!
    server.on('upgrade', async (req, socket, head) => {

      // Always handle error on incoming socket:
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          // Browser disconnected...refresh/etc.
          //log.error("Proxy", 'Client closed WebSocket abruptly (ECONNRESET)');
        } else {
          log.error("Proxy", err, 'WebSocket socket error:');
        }
        // Optional: do cleanup, logging, or ignore
      });

      // since here we have a default nodejs http request (not a express one)
      // we need to add the ulr and host info :)
      var URL = req.url || "";
      // ignore port (if set)
      var HOST = req.headers.host.split(":")[0];

      if (this.#endpoints[HOST]) {

        req._endpoint = this.#endpoints[HOST];
        req._proxyTarget = `${this.#endpoints[HOST].target}${URL}`;
        log.debug("WebSocket", `WS Upgrade for target: ${req._proxyTarget}`);

        wsProxy.upgrade(req, socket, head);

      } else {
        socket.destroy();
        return false
      }
    },

    );

    process.on('SIGTERM', () => this.#gracefulClusterShutdown('SIGTERM'));
    process.on('SIGINT', () => this.#gracefulClusterShutdown('SIGINT'));

  }


  #checkAuthHeaders(proxyReq, req) {

    var endpoint = req._endpoint;
    var user = req._user;

    if (endpoint.auth_headers !== false) {
      for (var header in endpoint.auth_headers) {

        // What to set
        let VAR = endpoint.auth_headers[header].split(".");
        let value = null;

        if (VAR[0] === "USER") {
          if (user[VAR[1]] !== undefined) value = user[VAR[1]];
          else {
            log.error("Auth", `No such var for auth header '${header}': ${VAR}`);
            continue;
          }
        } else if (VAR[0] === "CLIENT") {
          if (VAR[1] === "id") value = req.tenantId;
          else {
            log.error("Auth", `No such var for auth header '${header}': ${VAR}`);
            continue;
          }
        } else {
          log.error("Auth", `No such var for auth header '${header}': ${VAR}`);
          continue;
        }

        try {
          //  Add a custom header      
          proxyReq.setHeader(header, value);
          log.debug("Auth", `[${endpoint.app}] Set header: ${header}, ${value}`);
        } catch (e) {
          log.error("Proxy", e, `Cannot set header '${header}' with value: '${value}'`);
        }
      }
    }
  }


  async #gracefulClusterShutdown(signal) {

    this.stopping = true;

    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;
    this.hasCleanWorkerExit = true;
    try {
      if (cluster.isMaster) {
        await this.#shutdownWorkers(signal);
        log.debug("Proxy", `${this.processStr} - worker shutdown successful`);
      }
      await this.stop(); // stop yourself after the workers are shutdown if you are primary
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  }



  async #shutdownWorkers(signal) {

    return new Promise((resolve, reject) => {

      if (!cluster.isMaster) { return resolve(); }

      const wIds = Object.keys(cluster.workers);
      if (wIds.length == 0) { return resolve(); }
      // Filter all the valid workers
      const workers = wIds.map(id => cluster.workers[id]).filter(v => v);
      let workersAlive = 0;
      let funcRun = 0;
      // Count the number of alive workers and keep looping until the number is zero.
      const fn = () => {
        ++funcRun;
        workersAlive = 0;
        workers.forEach(worker => {
          if (!worker.isDead()) {
            ++workersAlive;
            if (funcRun == 1)
              // On the first execution of the function, send the received signal to all the workers
              worker.kill(signal);
          }
        });
        // console.log(workersAlive + ' workers alive\r\n');
        if (workersAlive == 0) {
          // Clear the interval when all workers are dead
          clearInterval(interval);
          return resolve();
        }
      };
      const interval = setInterval(fn, 500);
    });
  }


  // async #callIntegrationService(payload) {
  //   try {
  //     var result = await this.#messageQueues["SCINARIO-INTEGRATIONS"].send(payload);
  //     return result;
  //   } catch (e) {
  //     log.error("Integrations", null, e.toString());
  //   }
  // }

  /**
     * Spawns a child process
     *
     */
  #spawnChildProcess(name, globalEnv) {

    globalEnv = globalEnv || {};
    var withRespawn = (globalEnv.withRespawn === false) ? false : true;

    // ENV for child process
    let env = Object.assign({}, process.env, {
      name: name,
      MAIN_PID: this.#mainPID,
      clusterPort: this.#config.port,
      port: globalEnv.port
    });

    // Configure the cluster fork file
    // cluster.setupPrimary({
    //   //exec: this.#getForkPath(),
    //   //args: ['--use', 'https'],
    //   //silent: true,
    //   //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //   // NEVER EVER USE 'stdio: "inherit"' it
    //   // BREAKS the whole ipc heartbeat thing between children and parent
    //   // e.g. the heartbeat for zeromq!!!!!!
    //   //stdio: "inherit"
    //   //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // });

    this.#workers[name] = cluster.fork(env);

    this.#workers[name].process.stdout.on("data", (data) => {
      process.stdout.write(data);
    });
    // //this.#workers[name].process.stderr.pipe(process.stderr);
    this.#workers[name].process.stderr.on("data", (data) => {
      process.stdout.write(data);
    });
    this.#workers[name].process.on('uncaughtException', (err) => {
      console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
      console.error(err.stack)
    });

    this.#workers[name].on('close', function (code) {
      log.debug("Proxy", `Close worker ${name} with code '${code}'`)
    })

    // Optional: Restart worker on exit
    this.#workers[name].on('exit', (code, signal) => {


      var respawnTimeout = 2000;

      // There is ONLY one allowe process code
      // for a known restart (after install process)
      // with code "42"  
      if (code === 42) {
        respawnTimeout = 1;
        log.info("Proxy", `[PROCESS RESTART] Name:${env.name} (after initial install)`);
      } else {
        log.error("Proxy", `[PROCESS EXIT] code:${code}, signal:${signal}, Type: ${env.type}, Name:${env.name}`);
      }

      // set offline for this specific process     
      if (this.#stopping === true) return;

      if (withRespawn === true) {
        setTimeout(() => {
          log.info("Proxy", `Respawning worker '${name}'`);
          this.#spawnChildProcess(name, globalEnv);
        }, respawnTimeout);
      }
    });

    // e.g. Loggiong of is send to the main process!
    // this.#workers[name].on('message', (data) => {
    //    
    // });

    this.#messageQueues[name] = new ProcessConnector('main', this.#workers[name]);
    this.#messageQueues[name].setDispatcherFunction(async (data) => {
      this.#handleMessagesFromSubProcesses(data)
    });

    this.#workers[name].on('close', (code) => {
      process.stdout.write('Close worker');
      //process.exit();
    });

  }



  getEndpoint(url) {
    return this.#endpoints[url] || false;
  }
  registerEndpoint(url, config) {
    this.#endpoints[url] = config;
  }
  deregisterEndpoint(url) {
    delete this.#endpoints[url];
  }

  #handleMessagesFromSubProcesses(data) {

    if (data.topic === "SET_MODE") {

      if (data.type === "install") {
        log.info("Proxy", `Set mode by admin-ui: install`);
        this.#MODE = "install";

      } else if (data.type === "live") {
        log.info("Proxy", `Set mode by admin-ui: live`);
        this.#MODE = "live";

      }

      // init PermissionCache (if not yet done)
      if (!this.#cache) {
        this.#cache = new PermissionCache(this);
        this.#cache.init()
      }

      return;
    }

    if (data.topic === "endpoints") {

      // add default client endpoints!
      if (data.cmd === "addTenant") {
        log.info("Proxy", `Add tenant '${data.payload.tenantId}'`)
        this.#tenants[data.payload.tenantId] = new Tenant(this, data.payload);
        // add a throttle for this tenant!
        this.#setThrottle(data.payload.tenantId);

      }

      if (data.cmd === "add") {
        // add 
        let tech_name = data.payload.tech_name;
        let default_auth_method = data.payload.default_auth_method;
        let auth_method_config = data.payload.auth_method_config;
        let external_service = (data.payload.external_service === true) ? true : false;
        let code_injection_urls = false;
        let code_injection_patterns = false;

        // PREPARE special methods for auth_method_config
        if (auth_method_config && auth_method_config.byHeader) {
          // prepare the needed regExp
          for (var x in auth_method_config.byHeader) {
            let header = auth_method_config.byHeader[x];
            auth_method_config.byHeader[x].regex = new RegExp(header.pattern, header.flags);
          }
        }
        if (auth_method_config && auth_method_config.byURL) {
          // prepare the needed regExp
          for (var x in auth_method_config.byURL) {
            let url = auth_method_config.byURL[x];
            auth_method_config.byURL[x].regex = new RegExp(url.pattern, url.flags);
          }
        }
        // code injections!!
        if (data.payload.code_injection_urls) {

          code_injection_urls = [];
          code_injection_patterns = [];

          // prepare the needed regExp
          for (var x in data.payload.code_injection_urls) {
            let injection = data.payload.code_injection_urls[x];
            for (var reg in injection.patterns) {
              injection.patterns[reg] = new RegExp(injection.patterns[reg], "i");
              code_injection_patterns.push(injection.patterns[reg]);
            }
            code_injection_urls.push(injection);
          }

        }

       

        for (var x in data.payload.port_mappings) {

          let mapping = data.payload.port_mappings[x];
          if (!mapping.subdomain) continue;

          let url = `${mapping.subdomain}-${data.payload.tenantId}.${data.payload.baseDomain}`;
          log.info("Proxy", `Add entrypoint: ${url}, ${mapping.container}, ${mapping.internalPort}`);
          let endpoint = {
            app: (external_service === true) ? tech_name : mapping.container,
            tech_name: tech_name,
            external_service: external_service,
            target: `http://${(external_service !== true) ? mapping.container : mapping.ip}:${mapping.internalPort}`,
            default_auth_method: default_auth_method,
            auth_method_config: auth_method_config || false,
            auth_exception_urls: data.payload.auth_exception_urls || false,
            code_injection_urls: code_injection_urls,
            code_injection_patterns: code_injection_patterns,
            auth_headers: data.payload.auth_headers || false,
            // postinstall
            post_install_route: data.payload.post_install_route,
            generated_vars: data.payload.generated_vars
          }

          // with generic basic auth
          if (data.payload.basicAuth === true) endpoint.basicAuth = true;
          this.registerEndpoint(url, endpoint)
        }

        // console.log(this.#endpoints);

      } else if (data.cmd === "remove") {

        // stopped      
        for (var x in data.payload.port_mappings) {

          let mapping = data.payload.port_mappings[x];
          if (!mapping.subdomain) continue;

          let url = `${mapping.subdomain}-${data.payload.tenantId}.${data.payload.baseDomain}`;
          this.deregisterEndpoint(url)

          log.info("Proxy", `Remove entrypoint: ${mapping.container} (${url})`);

        }

      } else if (data.cmd === "destroy") {

        // remove    
        for (var x in data.payload.port_mappings) {

          let mapping = data.payload.port_mappings[x];
          if (!mapping.subdomain) continue;
          let url = `${mapping.subdomain}-${data.payload.tenantId}.${data.payload.baseDomain}`;
          // console.log(">>> remove:", url, mapping.container, port);
          this.deregisterEndpoint(url);
          log.info("Proxy", `Remove (destroy!) entrypoint: ${mapping.container} (${url})`);

          this.#cache.removeApp(mapping.container);

        }
      }
      //console.log(this.#endpoints);
    } else if (data.topic === "permissions") {
      if (data.cmd === "delete") this.#cache.deleteUserRights(data.payload.email, data.payload.tenantId)
      else if (data.cmd === "insert") this.#cache.addUserRights(data.payload.email, data.payload.tenantId, data.payload.role)
      else if (data.cmd === "clearLocalAppPasswordCache") this.#cache.clearLocalAppPasswordCache(data.payload.tenantId, data.payload.userId);

    } else if (data.topic === "sessions") {
      if (data.cmd === "init") this.#cache.initSession(data.payload.sessionId);
      else if (data.cmd === "delete") this.#cache.deleteSession(data.payload.sessionId);
      else if (data.cmd === "deleteAppPermissionOfUser") this.#cache.deleteUserRights(data.payload.email, data.payload.app);
      else if (data.cmd === "deleteAppPermissions") this.#cache.deleteAppRights(data.payload.app);
      else {
        log.error("Proxy", `No command '${data.cmd}' for topic 'sessions'`)
      }
    } else {
      log.error("Proxy", data, `Unknown topic: ${data.topic}`);
    }
  }

  async sendToProcess(processId, message) {
    return await this.#messageQueues[processId].send(message);
  }


}


/****
 * MAIN CLUSTER PROCESS
 * 
 */
async function main() {

  if (cluster.isPrimary) {
    try {
      var cl = new ClusterManagement();
      await cl.init({});
    } catch (e) {
      log.fatal("App", e, 'Cluster Start Error');
    }
  } else {
    // forked for a child process (e.g. worker, sandbox, sandbox manager or CORE)
    process.title = "{node} cc-admin-ui";
    var server = new (require("../express"));
    server.start();

  }
}
main();
