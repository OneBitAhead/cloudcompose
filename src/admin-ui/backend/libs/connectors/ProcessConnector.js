
// Interface for a connector class
class Connector {
  async init(){}
  async send(){}
  async ping(){}
  setDispatcherFunction(){}
}

// MainProcess to Fork connector
const randomUUID = require('crypto').randomUUID;

exports.ProcessConnector = class ProcessConnector extends Connector {

  constructor(type, process) {

    super();
    this.process = process;
    this.dispatcherFunc = null;

    // Message from the other side (main process or the fork)
    this.process.on('message', async(payload) => {

      var type = payload.type;

      /**
             * RESPONSE SIDE
             *
             * (e.g. unpack and recreate SCIError from JSON)
             */
      if (type == 'response' && payload.uuid && this.__promises[payload.uuid]) {
        // Buffer in payload...
        if (payload.data && payload.data.type == 'Buffer'){
          payload.data = new Buffer.from(payload.data.data);
        }

        // If the CORE code was throwing an error..we need to call "reject"(!)
        if (payload.error){
          this.__promises[payload.uuid].reject(payload.error);
        } else {
          this.__promises[payload.uuid].resolve(payload.data);
        }
        // clean up
        delete this.__promises[payload.uuid];

      }
      /**
             * REQUEST SIDE
             *
             * (e.g. pack SCIError as json for transport!)
             */
      else if (type == 'request'){

        try {
          payload.data = await this.dispatcherFunc(payload.data);
        } catch (e){
          delete payload.data;  
          payload.error = {id: e.code, stack: e.stack.toString()};
        }
        payload.type = 'response';
        this.process.send(payload);
      }
    });

    this.type = type;
    this.__promises = {};
  }

  setDispatcherFunction(func){
    if (typeof func === 'function') this.dispatcherFunc = func;
  }

  async init(){
    
    // #################################################################
    // PING is important !!! 
    // Needed for the sandbox-connector to know the sandbox is "online"!
    //##################################################################
    process.send("PING");


  }

  async send(data) {

    var payload = {
      type: 'request',
      uuid: randomUUID(),
      data: data,
    };
  
    return new Promise((resolve, reject) => {
      this.__promises[payload.uuid] = {
        resolve: resolve,
        reject: reject,
      };
      this.process.send(payload);
    });
  }

};

