
/**
 * Frontend-Module for using WS library from nodejs - backend
 * Adds a little sugar to the BASIC STUFF :) 
 * 
 */
class WSConnection{

    #serverCallbacks;
    #eventFuncMap;
    #functionMap;
    #wasDisconnected;
    #heartbeat;


    constructor(url){

      if(!url){
        let protocol = (window.location.protocol == "http:")? "ws":"wss";
        this.url = `${protocol}://${window.location.host}/ws`;
      } else {
        this.url = url;
      }      
      this.open = false;
      this.debug = false;

      this.#wasDisconnected = false;

      // Callbacks for async/await calls to backend, e.g. "subscribe"/"unsubscribe"; etc.
      this.#serverCallbacks = {}     
      // with event emitter2
      this.#eventFuncMap = {};
      this.#functionMap = {};

      this.emitter = new EventEmitter2({
        wildcard: true,
        delimiter: ":"
      });

    }


    //-------------------------------------------------------
    //--------- Connect/Reconnect/Close connection ----------
    //-------------------------------------------------------

    /**
     * Connect with the backend socket
     */
    async connect(){   

      this.connection = new WebSocket(this.url);     
      // Log messages from the server
      this.connection.onmessage = (e) => this.#receive(e.data);
      this.connection.onclose = (e) => this.closedByServer();

      // Log errors
      this.connection.onerror = (error) => {
        console.error('WebSocket Error ', error);
      };

      // When the connection is open, send some data to the server
      return new Promise((resolve, reject)=>{
        // Log errors
        this.connection.onerror = (error) => {
          console.error('WebSocket Error ', error);
          reject();
        };     
        this.connection.onopen = () => {
          this.open = true;  

          // events
          var eventCount = Object.keys(this.#eventFuncMap).length;

          this.#heartbeat = setInterval(()=>{               
            this.call("PING");
            //every 30 seconds
          },30*1000);

          if(this.#wasDisconnected === true){
            this.#wasDisconnected = false;
            if(this.debug) console.log("reconnected");
            // Resubscribe
            setTimeout(()=>{
              this.#resubscribe();            
            },1000);
          } else {
            if(this.debug) console.log("connected");
            if(eventCount > 0){      
              if(this.debug) console.log(`Subscribe to ${eventCount} event(s) that have been registered before initialy connected`);
              this.#resubscribe();
            }
          }         
          resolve();
        };
      });
    }


    /**
     * Subscribe to events in the function map (e.g. after a reconnect OR
     * if "on" was called to early and no connection was established already)
     * 
     */
    #resubscribe(){    
      for(var event in this.#eventFuncMap){
        this.call("subscribe", {event:event}).then((result)=>{
          if(this.debug) console.log(result);
        });
      }
    }


    /**
     * Automatic reconnection with the backend 
     * 
     */
    closedByServer(){
      this.open = false;
      this.#wasDisconnected = true;
      
      setTimeout(()=>{
        if(this.debug) console.log("Try to connect every 2 seconds")
        this.connect();
      },2000);
    }  
    
    
    uuidv4() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
        
    //-------------------------------------------------------
    //--------- Receive data from server  -------------------
    //-------------------------------------------------------

    /**
     * We want to act like an event emitter class from nodejs 
     * and be able to replace the basic socket.io methods
     * 
     * @param {*} event 
     * @param {*} callback 
     */
    on(event, callback){

      this.emitter.on(event, callback);   

      // create uuid to easy unsubscribe via uuid (no need to know the exakt function...)
      var uuid = this.uuidv4();
      this.#functionMap[uuid] = {event: event, callback: callback};
      
      // for a "unsubscribe all" we need all the functions for an event!
      if(this.#eventFuncMap[event] === undefined) this.#eventFuncMap[event] = new Map();
      this.#eventFuncMap[event].set(callback, {uuid: uuid});

      // if connected already...subscribe (otherwise the resubscribe will be called 
      // when connection is established)
      if(this.open === true){
        this.call("subscribe", {event:event}).then((result)=>{
            if(this.debug) console.log(result);
        });
      } else {
        if(this.debug) console.log("Event will be subscribed, when connection is opened: "+event);
      }
      return uuid;
    }

    offById(uuid){
      let fn = this.#functionMap[uuid];
      if(!fn) return false;
      this.off(fn.event, fn.callback);
    }

    // Deregister again
    off(event, callback){
      if(callback) {
        this.emitter.off(event, callback);  
        if(this.#eventFuncMap[event]) {
          let fn = this.#eventFuncMap[event].get(callback);
          if(fn) {
            delete this.#functionMap[fn.uuid];
            this.#eventFuncMap[event].delete(callback);
          }
        }
      } else {
        if(this.#eventFuncMap[event]){
          this.#eventFuncMap[event].forEach((value, key)=>{
            let fn = this.#eventFuncMap[event].get(key);
            if(fn) {
              delete this.#functionMap[fn.uuid];
              this.#eventFuncMap[event].delete(key);
            }           
          });
        }     
      }
      if(this.#eventFuncMap[event] && this.#eventFuncMap[event].size == 0){
        delete this.#eventFuncMap[event];
        // if not connected?
        if(this.open === true){
          this.call("unsubscribe", {event:event}).then((result)=>{
              if(this.debug) console.log(result);
          });
        }
      }      

    }

    list(){
      return {
        events: this.#eventFuncMap,
        ids: this.#functionMap
      }
    }

    #receive(data){

      try{
        var data = JSON.parse(data);
      }catch(e){
        if(this.debug) console.log(data);
        return;
      }

      if(data.callbackUUID){        
        if(this.#serverCallbacks[data.callbackUUID]){       
          this.#serverCallbacks[data.callbackUUID](data.data.err, data.data.returnValue);
          delete this.#serverCallbacks[data.callbackUUID];
        }
        return;
      }

      // Send events
      if(data.event){
        this.emitter.emit(data.event, data.event, data.data);
      } else {
        if(this.debug) console.log(data);
      }
    }


    //-------------------------------------------------------
    //--------- Send data to server -------------------------
    //-------------------------------------------------------
    emit(event, data){
      if(!this.open) return console.error("Not (yet) connected to web socket");
      this.connection.send(JSON.stringify({event: event, data: data}));
    }

    #send(data){
      this.connection.send(JSON.stringify(data));
    }


    // Send data with a callback (old way for socket.io compatibility or without callback returns a promise)
    call(event, data){

        if(!this.open) return console.error("Not (yet) connected to web socket");

        // Generate a callback uuid for the callback return identifier
        let uuid = this.uuidv4();

        let payload = {
          "event": event,
          "data": data,
          "callbackUUID": uuid
        };

        // Send data to the backend....
        this.#send(payload);

        // Return a promise that resolves eventually with the returning
        // event from the server
        return new Promise((resolve, reject)=>{
          this.#serverCallbacks[uuid] = (err, data)=>{
              if(err) reject(err);
              else resolve(data);
          }
        });
    }


    //-------------------------------------------------------
    //--------- Room addons ---------------------------------
    //-------------------------------------------------------
    /**
     * Join a room
     * 
     * @param {*} room 
     */
    joinRoom(room){
      this._room = room;
      this.emit("enterRoom",{"room":room});      
    }
    /**
     * Leave a room
     */
    leaveRoom(){
      this.emit("leaveRoom");
      this._room = undefined;
    }
    /**
     * Send a message in the chat
     */
    sendMsg(message){
      this.emit("chatMsg",{"msg":message});
    }

  



  }


  