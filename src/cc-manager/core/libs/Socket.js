const path = require("node:path");
const fsp = require("node:fs/promises");
const SocketConnector = require('./SocketConnector.js');
const Tenant = require("./Tenant.js");

module.exports = class Socket {

  #con;
  #socket;
  #topics; 
  #CONTEXT;

  constructor(CONTEXT) {

    this.#CONTEXT = CONTEXT;

    this.#topics = {};
    // initialize pathes
    this.#socket = path.join(process.env.F_sockets,"admin2docker-proxy.sock");

    this.#con = new SocketConnector({
      type: "server",
      debug: false,
      sockets: {
        serverSocket: this.#socket
      },
      onConnect:(socket)=>{        
        this.send({topic:"getTenants"});
      }

    });

    this.#con.setDispatcherFunction(async (data) => { return await this.#dispatch(data) });
    
  }

  async init(){

    await this.#con.init();
    log.info(`Socket`,`Docker Proxy (via socket) running: ${this.#socket}`)

    var UID = parseInt(process.env.DEFAULT_GID || '2000', 10);
    var GID = parseInt(process.env.DEFAULT_UID || '2000', 10);

    fsp.chown(this.#socket, UID, GID);

  }

  async send(data){
    return this.#con.send(data);
  }


  // register topics
  registerTopic(topic, options){

    log.debug("Socket", `Registered topic '${topic}': ${Object.keys(options)}`);
    this.#topics[topic] = {scope: options.scope || this, fn: options.fn};

  }

  async #dispatch(data) {

    try {
      var topic = data.topic;
      var cmd = data.cmd;
      var payload = data.payload;
      var tenantId = data.tenantId;
      var tenant = null;    

      if(topic === "registerTenant"){
        if(this.#CONTEXT.tenants[tenantId]===undefined){
          log.info("Socket", `Init tenant ${tenantId}`);
          this.#CONTEXT.tenants[tenantId] = new Tenant(tenantId, payload, false);     
        } else {
          log.debug("Socket",`Already registered (tenant: ${tenantId}`)
        }
      }
      
      if(tenantId !== "*"){
        tenant = this.#CONTEXT.tenants[tenantId];
        if(!tenant)  {
          log.error("Socker", `Unknown tenant: ${tenantId}, ${topic}, ${cmd}`)
          return { error: `Unknown tenant: ${tenantId}, ${topic}, ${cmd}`};
        }
      }  
      let topicData = this.#topics[topic];
      if(topicData){
        return await topicData.fn.apply(topicData.scope, [tenant, cmd, payload]);
      } else {
        return { error: `Topic unknown: ${topic}` }
      }
    } catch (e) {
      // return the error
      return { error: e.toString() };
    }
  }




}