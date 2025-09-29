'use strict';
/*

Copyright (c) 2016-2021 Hexagon <robinnilsson@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/**
 * @typedef {Object} CrocketServerOptions - Crocket Options
 * @property {string} [path] - Path to socket, defaults to /tmp/crocket-ipc.sock
 * @property {string} [host] - Hostname/ip to connect to/listen to
 * @property {number} [port] - Port to connect/listen to, if port is specified, socket path is ignored and tcp is used instead
 * @property {string} [encoding] - Encoding for transmission, defaults to utf8
 */

/**
 * @typedef {Object} CrocketClientOptions - Crocket Options
 * @property {string} [path] - Path to socket, defaults to /tmp/crocket-ipc.sock
 * @property {string} [host] - Hostname/ip to connect to/listen to
 * @property {number} [port] - Port to connect/listen to, if port is specified, socket path is ignored and tcp is used instead
 * @property {number} [timeout] - In ms, defaults to 2000 for server and 5000 for client
 * @property {number} [reconnect] - How many ms between reconnection attempts, defaults to -1 (disabled)
 * @property {string} [encoding] - Encoding for transmission, defaults to utf8
 */


const net = require('node:net');
const EventEmitter = require('node:events');

class Crocket {

  #prefix;
  #separator = '<<<EOM\0';
  #defaults = {
    server: {
      path: '/tmp/crocket-ipc.sock',
      host: null,
      port: null,
      timeout: 2000,
      encoding: 'utf8',
    },
    client: {
      path: '/tmp/crocket-ipc.sock',
      host: null,
      port: null,
      reconnect: -1,
      timeout: 5000,
      encoding: 'utf8',
    },
  };

  /**
  * Crocket constructor
  *
  * @constructor
  * @param {*} [mediator] - Mediator to use, EventEmitter is default
  * @returns {Crocket}
  */
  constructor(mediator) {

    // Connect mediator
    if (mediator) {
      /** @type {*} */
      this.mediator = new mediator();
    } else {
      /** @type {*} */
      this.mediator = new EventEmitter();
      // Register bogus error listener, but why?
      this.mediator.on('error', () => { });
    }

    this.#prefix = (process.platform === 'win32') ? '//./pipe/' : '';

    this.sockets = [];
    this.connectTimeout = void 0;
    this.buffer = void 0;

    /** @type {CrocketClientOptions|CrocketServerOptions} */
    this.opts = {};

    return this;
  }


  // integrated xpipe function
  #eq(path) { 
    if (this.#prefix.endsWith('/') && path.startsWith('/')) {
      return this.#prefix + path.substring(1);
    }
    return this.#prefix + path;
  }
 


  /**
    * @private
    * @param {*} message
    * @param {*} socket
    */
  #onMessage(message, socket) {
    try {
      var incoming = JSON.parse(message);
      if (incoming && incoming.topic) {
        this.mediator.emit(incoming.topic, incoming.data, socket, incoming.pid);
      } else {
        this.mediator.emit('error', new Error('Invalid data received.'));
      }
    } catch (e) {
      this.mediator.emit('error', e);
    }
  }


  /**
    * @private
    * @param {*} data
    * @param {*} socket
    */
  #onData(data, socket) {

    // Append to buffer
    if (this.buffer) {
      this.buffer += data;
    } else {
      this.buffer = data;
    }

    // Did we get a separator
    if (data.indexOf(this.#separator) !== -1) {
      while (this.buffer.indexOf(this.#separator) !== -1) {
        var message = this.buffer.substring(0, this.buffer.indexOf(this.#separator));
        this.buffer = this.buffer.substring(this.buffer.indexOf(this.#separator) + this.#separator.length);
        if (message) {
          this.#onMessage(message, socket);
        }
      }
    }

  }


  /**
    * Register a callback for a mediator event
    *
    * @public
    * @param {string} event
    * @param {Function} callback
    * @returns {Crocket}
    */
  on(event, callback) {
    this.mediator.on(event, callback);
    return this;
  }

  /**
    * Emit a mediator message
    *
    * @public
    * @param {string} topic
    * @param {*} data
    * @param {Function} [callback]
    * @returns {Crocket}
    */
  emit(topic, data, callback) {

    try {
      var message = JSON.stringify({ topic: topic, data: data, pid: process.pid }) + this.#separator;
      this.sockets.forEach(function (socket) {
        socket.write(message);
      });
      callback && callback();
    } catch (e) {
      if (callback) {
        callback(e);
      } else {
        this.mediator.emit('error', e);
      }
    }
    return this;
  }

  /**
    * Close IPC connection, used for both server and client
    *
    * @public
    * @param {Function} [callback]
    * @returns {Crocket}
    */
  close(callback) {
    if (this.isServer) {
      this.server.close();
      if (callback) this.server.on('close', callback);
    } else {
      this.opts.reconnect = -1;
      clearTimeout(this.connectTimeout);
      this.sockets[0].destroy(callback);
    }
    return this;
  };

  /**
    * Start listening
    *
    * @public
    * @param {CrocketServerOptions} options
    * @param {Function} callback
    * @returns {Crocket}
    */
  listen(options, callback) {

    // ToDo, make options optional
    this.opts = Object.assign(Object.assign(this.opts, this.#defaults.server), options);
    this.isServer = true;

    this.server = net.createServer();

    this.server.on('error', (e) => this.mediator.emit('error', e));

    // New connection established
    this.server.on('connection', (socket) => {
      this.sockets.push(socket);
      this.mediator.emit('connect', socket);
      socket.setEncoding(this.opts.encoding);
      socket.on('data', (data) => this.#onData(data, socket));
      socket.on('close', (socket) => {
        this.mediator.emit('disconnect', socket);
        this.sockets.splice(this.sockets.indexOf(socket), 1);
      });
      socket.on('error', (e) => {
        this.mediator.emit('error', e);
      });
    });

    this.server.on('close', () => {
      this.mediator.emit('close');
    });

    // Start listening
    if (this.opts.port) {
      this.server.listen(this.opts.port, this.opts.host, callback);
    } else {
      this.server.listen(this.#eq(this.opts.path), callback);
    }

    return this;
  }

  /**
    * Connect to a Crocket server
    *
    * @public
    * @param {CrocketClientOptions} options
    * @param {Function} callback
    * @returns {Crocket}
    */
  connect(options, callback) {

    // ToDo, make options optional
    this.opts = Object.assign(Object.assign(this.opts, this.#defaults.client), options);
    this.isServer = false;

    var socket = new net.Socket();
    this.sockets = [socket];

    var flagConnected;

    var connected = () => {
      flagConnected = true;
      clearTimeout(this.connectTimeout);
      callback && callback();
    };

    var connect = (first) => {
      if (this.opts.port) {
        socket.connect(this.opts.port, this.opts.host, first ? connected : undefined);
      } else {
        socket.connect(this.#eq(this.opts.path), first ? connected : undefined);
      }
      this.connectTimeout = setTimeout(() => {
        if (!flagConnected) {
          socket.destroy();
          if (this.opts.reconnect === -1) {
            callback(new Error('Connection timeout'));
          }
        }
      }, this.opts.timeout);
    };

    socket.setEncoding(this.opts.encoding);

    // Added by GT: connect event (used for "reconnect" too!!)
    socket.on('connect', () => {
      this.mediator.emit('connected');
    });
    // --end of added by GT--

    socket.on('error', (e) => {
      this.mediator.emit('error', e);
    });

    socket.on('data', (data) => {
      this.#onData(data, socket);
    });

    socket.on('close', () => {
      if (this.opts.reconnect > 0) {
        setTimeout(() => connect(), this.opts.reconnect);
      } else {
        this.mediator.emit('close');
      }
    });

    connect(true);

    return this;
  }
}//end-of-crocket



// IPC connector
const randomUUID = require('node:crypto').randomUUID;
const fs = require('node:fs');
const path = require("node:path");


module.exports = class SocketConnector {

  #id;
  #debug;
  #promises;
  #dispatcherFunc;
  #closeFunc;
  #stats;
  #closed;

  #connected = false;
  #connectedPromise;
  #connectedPromiseResolve;
  #onConnectCallback;
 


  constructor(config) {

    config = config || {};

    this.#closed = false;

    this.#id = randomUUID();
    this.#debug = (config.debug === true) ? true : false;
    this.#stats = {
      messagePerServerSockerFile: 0,
      messagePerAnswerSockerFile: 0
    }

    this.#onConnectCallback = config.onConnect || false;


    // two modes: config.type = "server"|"client"
    this.type = config.type || 'server';
    
    // Sockets:
    //      serverSocket: "name",
    //      answerSocket: "name"
    config.sockets = config.sockets || {};
    this.serverSocketFile = config.sockets.serverSocket || '/tmp/default.sock';

    // if withAnswerSocket === true
    if(config.withAnswerSocket){
      // change the default socket path and add a "reply" to it
      var fileInfo = path.parse(this.serverSocketFile);
      config.sockets.answerSocket = path.join(fileInfo.dir,fileInfo.name+"_reply"+fileInfo.ext);
    }

    this.answerSocketFile = config.sockets.answerSocket || null;    
    this.reconnectAfterMS = config.reconnectAfterMS || 1000;
    // e.g. {rights: {"chmod": 744, "chown": {"uid": 2000, "gid": 5000}}}
    this.rights = config.rights || null;

    this.pingTimeoutMS = config.pingTimeoutMS || 500;

    this.#promises = {};
    this.#dispatcherFunc = () => { console.error("NO DISPATCH FUNCTION REGISTERED!") };

    this.requestChannel = null;
    this.responseChannels = {};


    if(config.closeFunc) this.#closeFunc = config.closeFunc;
    


    this.#setDisconnected();

  }

  setDispatcherFunction(func) {
    if (typeof func === 'function') this.#dispatcherFunc = func;
  }


  getId(){
    return this.#id;
  }


  async init() {


    if (this.type == 'server') {
      // Create ONE server channel
      var channel = await this.#createServer(this.serverSocketFile, this.rights);
      this.responseChannels['default'] = channel;
      this.requestChannel = channel;
    } else if (this.type == 'client' && this.answerSocketFile === null) {
      // Create ONE client channel
      var channel = await this.#createClient(this.serverSocketFile, this.rights);
      this.responseChannels['default'] = channel;
      this.requestChannel = channel;
    } else if (this.type == 'client' && this.answerSocketFile !== null) {
      // Create the answer channel first
      var channel = await this.#createServer(this.answerSocketFile, this.rights);
      this.responseChannels['default'] = channel;
      // Create ONE client channel
      var channel = await this.#createClient(this.serverSocketFile, this.rights);
      this.requestChannel = channel;
    }


    this.#initEventHandler();


  }

  async close(){

    this.#setDisconnected();
    if(this.type === "server"){
      this.requestChannel.emit('/exit');
    }
    if(this.responseChannels['default']) this.responseChannels['default'].close();
    if(this.requestChannel) this.requestChannel.close();  
   
    this.#closed = true;
    if(this.#closeFunc) this.#closeFunc(this.#id);
  }


  getStats() {

    if (this.requestChannel && this.requestChannel.uuid === this.responseChannels['default'].uuid) {
      console.log("SEND: ", this.requestChannel.send);
      console.log("RECEIVED: ", this.requestChannel.received);

    } else {
      console.log("requestChannel: SEND: ", this.requestChannel.send);
      console.log("requestChannel: RECEIVED: ", this.requestChannel.received);
      console.log("responseChannel: SEND: ", this.responseChannels['default'].send);
      console.log("responseChannel: RECEIVED: ", this.responseChannels['default'].received);
    }

  }


  /**
     * Create a listener (server) socket
     *
     */
  async #createServer(socketFile, rights) {

    var channel = new Crocket();
    channel.uuid = randomUUID();
    channel.received = 0;
    channel.send = 0;

    try {
      fs.unlinkSync(socketFile);
    } catch (e) {
      if (e.code !== 'ENOENT') log.error("Socket", e, `Remove the socket file fails!`);
    }

    // React to communication errors
    channel.on('error', (e) => { console.error('Communication error occurred: ', e.code); });
    channel.on('connect', (socket) => {
      log.info("Socket",'Client connected');
      if(typeof this.#onConnectCallback === "function") this.#onConnectCallback(socket);
    });

    return new Promise((resolve, reject) => {

      // Start listening, this example communicate by file sockets
      channel.listen({ path: socketFile }, (e) => {
        // log.error("App", e);
        // Fatal errors are supplied as the first parameter to callback
        if (e) reject(e);
        try{
             fs.chmodSync(socketFile, 0o770);
             if(rights && rights.chmod){
                 fs.chmodSync(socketFile, rights.chmod);
             }
             if(rights && rights.chown){
                 // change owner of the socket!!                 
                 fs.chownSync(socketFile, rights.chown.uid || 2000, rights.chown.gid || 2000);
             }
         }catch(e){
             log.error("Socket", e);
        }
        // All is well if we got this far
        log.debug("Socket",'IPC listening on ' + socketFile);
        resolve(channel);
      });
    });

  }

  /**
     * Create a client socket
     *
     */
  async #createClient(socketFile) {

    this.#setDisconnected();

    var channel = new Crocket();
    channel.uuid = randomUUID();
    channel.received = 0;
    channel.send = 0;

    // React to communication errors
    channel.on('error', (e) => {

      this.#setDisconnected();
      
      if (e.code == 'ENOENT') {
        if (this.#debug) console.error(`[${this.#id}] No socket file '${socketFile}' in place. Is Server started?`);
   
      } else if (e.code == 'ECONNREFUSED') {
        if (this.#debug) console.error(`Socket file ${socketFile} exists, but server is not connected!`);   
      } else {
        console.error('Communication error occurred: ', e);
      }
    });

    channel.on('connected', () => {
      // if we have a separat answer channel...tell that to the server!
      // so the server can connect to it!!!
      if (this.answerSocketFile !== null) {
        channel.emit('/settings', {
          pid: process.pid,
          socketFile: this.answerSocketFile,
        });
      }
      if(this.#debug) console.log(`CONNECTED: Connected to server socket (${socketFile})`);

      this.#setConnected();
      if(typeof this.#onConnectCallback === "function") this.#onConnectCallback();

    });

    return new Promise((resolve, reject) => {
      channel.connect({
        path: socketFile,
        reconnect: this.reconnectAfterMS,
      }, (e) => {
        // Connection errors are supplied as the first parameter to callback
        if (e) reject(e);
        resolve(channel);
      });
    });
  }



  #setConnected(){
    this.#connected = true;
    this.#connectedPromiseResolve();
  }
  #setDisconnected(){
    this.#connected = false;
    this.#connectedPromise = new Promise((resolve)=>{
      this.#connectedPromiseResolve = resolve;
    });
   
  }



  #initEventHandler() {

    // Expect a reply on '/response'
    this.responseChannels['default'].on('/response', (payload) => {

      this.responseChannels['default'].received++;

      // check payload for uuid
      if (payload.uuid){
        if(this.#promises[payload.uuid]) {
          // Buffer in payload...
          if (payload.data && payload.data.type == 'Buffer') {
            payload.data = new Buffer.from(payload.data.data);
          }
          if (payload.error) this.#promises[payload.uuid].reject(payload.error);
          else this.#promises[payload.uuid].resolve(payload.data);
          delete this.#promises[payload.uuid];
          if(this.#debug) console.log(`[${this.#id}] Delete promise: ${payload.uuid}`);
        } else {
          log.error("Socket", `[${this.#id}] No open payload uuid: ${payload.uuid}`);
          // log.info("Socket",`[${this.#id}] Existing uuids waiting for responses: ${Object.keys(this.#promises)}`);
        }
      } else {
        log.error("Socket", `[${this.#id}] NO PAYLOAD UUID in a /response? ${JSON.stringify(payload,null,3)}`);
        // console.log(`[${this.#id}] Existing uuids waiting for responses: ${Object.keys(this.#promises)}`);
      }

    });


    this.requestChannel.on('/exit', async (payload, socket, pid) => {
      if(this.type === "client"){
        // console.log("server send an EXIT...so close the connection!")
        this.close();
      }     
    });


    // REQUEST: GOING IN ....
    this.requestChannel.on('/request', async (payload, socket, pid) => {

      this.requestChannel.received++;

      if (this.#debug) console.log(this.type, "request: ", payload);
      // Run something and answer....
      try {
        payload.data = await this.#dispatcherFunc(payload.data);
      } catch (e) {
        delete payload.data;
        payload.error = e.toString();
      }
      // in a multi-listener environment, we need to decide on which channel
      // we are sending a response!
      if (this.responseChannels['pid_' + pid]) {
        this.responseChannels['pid_' + pid].emit('/response', payload);
      } else {
        if (this.#debug) console.log(this.type, "response: ", payload);
        this.responseChannels['default'].emit('/response', payload);
      }
    });
    // PING and PONG
    this.requestChannel.on('/ping', async (payload, socket, pid) => {

      payload.data = true;
      // in a multi-listener environment, we need to decide on which channel
      // we are sending a response!
      if (this.responseChannels['pid_' + pid]) {
        this.responseChannels['pid_' + pid].emit('/response', payload);
      } else this.responseChannels['default'].emit('/response', payload);
    });

    // Settings (if in two-socket-mode)
    this.requestChannel.on('/settings', async (payload) => {
      if (this.type !== 'server') return;
      // Create the answer channel first
      var channel = await this.#createClient(payload.socketFile, payload.rights);
      this.responseChannels['pid_' + payload.pid] = channel;
    });

  }


  async ping() {

    var payload = {
      uuid: randomUUID(),
    };
    // set a timeout....
    var p = new Promise((resolve, reject) => {
      this.#promises[payload.uuid] = {
        resolve: resolve,
        reject: reject,
      };
      this.requestChannel.emit('/ping', payload);
    });

    // After pingTimeoutMS...the PING promise is deleted and "rejected"
    setTimeout(() => {
      if (this.#promises[payload.uuid] == undefined) return;
      this.#promises[payload.uuid].resolve(false);
      delete this.#promises[payload.uuid];
      if(this.#debug) console.log(`[${this.#id}] PING Delete promise: ${payload.uuid}`);
    }, this.pingTimeoutMS);

    return p;
  }

  isConnected(){
    return this.#connected;   
  }
  async waitForConnection(){

    // if connection was closed....start again!
    if(this.#closed === true) await this.init();

    await this.#connectedPromise;
  }

  async send(data) {

    var payload = {
      uuid: randomUUID(),
      data: data,
    };

    return new Promise((resolve, reject) => {
      this.#promises[payload.uuid] = {
        resolve: resolve,
        reject: reject,
      };

      if(this.#debug) console.log(`[${this.#id}] Add request uuid: ${payload.uuid}`);
      if(this.#debug) console.log("emit /request:", payload);
      if(this.#debug) console.log(`[${this.#id}] Open promises: ${Object.keys(this.#promises)}`);


      this.requestChannel.send++;
      this.requestChannel.emit('/request', payload);

    });
  }

};

