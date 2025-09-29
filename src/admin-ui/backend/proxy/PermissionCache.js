const path = require("node:path");
const knex = require("knex");
const Helper = require("./../libs/Helper");


module.exports = class PermissionCache {

  // parent object (proxy)
  #proxyObj;
  // session db access via sqlite/knex
  #sessionDB;
  // we cache the users client-roles in keycloak 
  // here in a nodejs memory cache by app 
  // (and refresh it on the first access to a app)
  // so we can delete the cache, if the user rights are changed 
  // in the admin ui :)
  #userRightsCache;
  #sessionToEmail;
  #sessionCache;
  
  // basicAuth cache!
  #passwordCache;
  // local app password cache
  #localPasswordCache;

  constructor(proxyObj) {

    this.#proxyObj = proxyObj;
    this.#userRightsCache = {};
    this.#sessionCache = {};
    this.#passwordCache = {};
    this.#localPasswordCache = {};
    this.#sessionToEmail = {};
    // Session db
    this.#sessionDB = knex({
      client: 'better-sqlite3',
      connection: {
        filename: path.join(process.env.F_adminData, "cloudcompose.db")
      },
      useNullAsDefault: true
    });    
  }

  /**
   * Initialize the PermissionCache
   * 
   * The cache reads all existing sessions from the database to 
   * have all sessions present.
   * 
   */
  async init() {

    log.info("PermissionCache", "Initialize");
    try{
      log.debug("PermissionCache","Fill cache from session db on init proxy")
      await this.removeExpiredSessions();
      var sessions = await this.#sessionDB.table("sessions").select("sid");
      for (var x in sessions) {
        await this.initSession(sessions[x].sid);
      }  
    } catch(e){
      log.error("PermissionCache",e);
    }
  }

  // Remove expired sessions
  async removeExpiredSessions() {
    try{        
      var deletions = await this.#sessionDB.table("sessions").select("sid", "expire").where("expire", '<', (new Date()).toISOString()).delete();
      log.debug("PermissionCache","Deleted (expired) sessions:", deletions);
    }catch(e){
      log.error("PermissionCache", e);
    }
  }


  /**
   * Remove app (from cache and session) 
   * App was destroyed
   * 
   */
  async removeApp(app){

    // run through all sessions and remove the "app"
    for(var x in this.#userRightsCache){
      let email = x;
      var sessionIds = this.#getSessionsOfUser(email);

      if(this.#userRightsCache[email].apps[app]){
        delete this.#userRightsCache[email].apps[app];
        for(var y in sessionIds){
          await this.#syncSessionToCache(sessionIds[y])
        }        
      }
    } 
  }

  
  /**
   * Get session from cache or db by sessionId
   * 
   *  
   */
  async getSession(sessionId) {

    if(this.#sessionCache[sessionId]){
      return this.#sessionCache[sessionId];
    }      
    try{
      // check the session in the db
      var sessiondata = await this.#sessionDB.table("sessions").select("*").where("sid", sessionId);
      var data = (sessiondata[0]) ? JSON.parse(sessiondata[0].sess) : {};
      if (!data.passport || !data.passport.user) return false;
      var user = data.passport.user;   
      this.#sessionCache[sessionId] = user;
      return user

    }catch(e){
      log.error("PermissionCache",e);
      return 
    }
  }
  

  async getLocalAppPassword(tenantId, userId, project){


      var cacheHit = Helper.getVar(this.#localPasswordCache,`${tenantId}.${userId}.${project}`, false);
      if(cacheHit){
        log.debug("PermissionCache","Local password from cache");
        return cacheHit;
      }

      // refresh app passwords
      var localAppPasswords = await this.#proxyObj.sendToProcess("AdminUI", { tenantId: tenantId, topic: "users", cmd: "app_passwords", payload: { userId: userId } });
    
      for(var x in localAppPasswords){
        var entry = localAppPasswords[x];
        Helper.setVar(this.#localPasswordCache,`${tenantId}.${userId}.${entry.app.project}`, entry.password);
      }
      return Helper.getVar(this.#localPasswordCache,`${tenantId}.${userId}.${project}`, false);     

  }

  clearLocalAppPasswordCache(tenantId, userId){

    if(this.#localPasswordCache[tenantId]){
      delete this.#localPasswordCache[tenantId][userId];
    }

  }



  async identifyUserByBasicAuth(tenant, email, password){

    var type = "password";   
    var hashedPwd = Helper.createPasswordHash(email+password);
    if(this.#passwordCache[email]){
      log.debug("PermissionCache","BasicAuth from cache")
      if(this.#passwordCache[email][type] === hashedPwd) return this.#passwordCache[email];
      else return false;
    }
    // get from db
    var user = await tenant.getUser(email);
    if(!user) {
      log.warn("Auth", `No basic-auth user found '${email}'`);
      return false;
    }
    this.#passwordCache[email] = user;
    if(user[type] === hashedPwd) return user;
    else return false;
  }



  /**
   * Write data to the session DB!
   * 
   */
  async #writeToSession(sessionId, key, value) {

    try{
      // check the session in the db
      var sessiondata = await this.#sessionDB.table("sessions").select("*").where("sid", sessionId);
      var data = (sessiondata[0]) ? JSON.parse(sessiondata[0].sess) : {};
      if (!data.passport || !data.passport.user) return false;
      var user = data.passport.user;   
      // add / overwrite key:value
      user[key] = value;
      var update = await this.#sessionDB.table("sessions").where("sid", sessionId).update("sess", JSON.stringify(data));
      if(update === 1) return true;
      else return false;
      
    }catch(e){
      log.error("PermissionCache",e);
      return 
    }
  }



  async #getSessionsOfUser(email){

    var sessionIds = [];
    for(var x in this.#sessionToEmail){
      if(this.#sessionToEmail[x] === email) sessionIds.push(x);
    }
    return sessionIds;

  }


  /**
   * Permissions of Users for an app (keycloak/local)
   *  
   * Before this call there was always a sessionId or basic-auth check
   */
  async getUserRights(tenantId, type, app) {

    // we need the mail for fetching rights (can have multiple sessions..)
    let email = null;

    // Session ID provided
    if(type.sessionId){
      let sessionId = type.sessionId;
      // mail from session cache...
      email = this.#sessionToEmail[sessionId];
      if(!email){
        // check the session in the db
        var user = await this.getSession(sessionId);
        // NO VALID SESSION --> return
        if(!user) return false;      
        email = user.email;
        // add to lookup!
        this.#sessionToEmail[sessionId] = email;
      }
    } else if (type.email){
      email = type.email;
    }

    var rights = (this.#userRightsCache[email] && this.#userRightsCache[email].apps) ? this.#userRightsCache[email].apps[app]:false;      
    if (rights) {
      log.debug("PermissionCache",`Cache hit: ${app} (${email})`);
      return rights;
    }
    else {    

      log.debug("PermissionCache", `Request rights for '${tenantId}', ${email}, ${app}`);

      // ask admin ui to request it from cc-manager (so keycloak / local db is asked)
      var rights = await this.#proxyObj.sendToProcess("AdminUI", { tenantId: tenantId, topic: "users", cmd: "client-roles", payload: { email: email, clientId: app } });
      if (rights.error) {
        log.error("PermissionCache",rights.error);
        // return NO rights
        return [];
      }
      log.info("PermissionCache", rights, "Rights (from db or keycloak):");
      if (!this.#userRightsCache[email]) this.#userRightsCache[email] = { apps: {} };
      this.#userRightsCache[email].apps[app] = rights;           
      return rights;
    }
    
  }

  /**
   * Deletes clientId (app) for a user (by email) from ALL existing sessions
   */
  async deleteUserRights(email, app) {    
    // All or just for one app
    if(!app) delete this.#userRightsCache[email];
    else if(this.#userRightsCache[email]) {      
      delete this.#userRightsCache[email].apps[app];    
      // update session with cache!
      var sessionIds = this.#getSessionsOfUser(email);
      for(var x in sessionIds){
        await this.#syncSessionToCache(sessionIds[x]);
      }
    }    
  }


  async deleteAppRights(app){

    for(var email in this.#userRightsCache){
      // no permissions entry for this app...
      if(!this.#userRightsCache[email].apps[app]) continue;
      delete this.#userRightsCache[email].apps[app];
      // update session with cache!
      var sessionIds = this.#getSessionsOfUser(email);
      for(var x in sessionIds){
        await this.#syncSessionToCache(sessionIds[x]);
      }   
    }    
  }

  /**
   * Adds clientId (app) for a user (by email) in ALL existing sessions of the user
   */
  async addUserRights(email, clientId, role) {

    if(!this.#userRightsCache[email]) this.#userRightsCache[email] = {apps: {}};     
    if(this.#userRightsCache[email].apps[clientId] === undefined)  this.#userRightsCache[email].apps[clientId] = [];
    if(this.#userRightsCache[email].apps[clientId].indexOf(role) === -1) this.#userRightsCache[email].apps[clientId].push(role);
    // update session with cache!
    var sessionIds = this.#getSessionsOfUser(email);
    for(var x in sessionIds){
      await this.#syncSessionToCache(sessionIds[x]);
    }      
  }

  
  async initSession(sessionId) {    
    try {
      var user = await this.getSession(sessionId);
      var email = user.email;
      log.debug("PermissionCache",`Init session: ${email} (${sessionId})`);
      // lookup
      this.#sessionToEmail[sessionId] = email;
      this.#userRightsCache[email] = { apps: user.permissions || []};
    } catch (e) {
      log.error("PermissionCache",e);
    }  
  }


  async #syncSessionToCache(sessionId){
    try {      
      var user = await this.getSession(sessionId);
      if(user){
        var permissions = this.#userRightsCache[user.email].apps;   
        await this.#writeToSession(sessionId, "permissions", permissions)
      }
    }catch(e){
      log.error("PermissionCache",e);
    }   
  }

  /**
   * Deletes user session from cache
   */
  async deleteSession(sessionId) {
    delete this.#sessionToEmail[sessionId];
  }



}