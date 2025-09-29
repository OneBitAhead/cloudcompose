const fs = require("fs");
const path = require("path");
const WebSocket = require('ws');

/**
 * WebSocket handling (including rooms)
 */
class WebSocketHandler {

    #tenant;
    #debug;
  
    constructor(tenant, options){


        this.#tenant = tenant;       
        this.options = options || {};
   
        this.sessionStore = options.sessionStore || {};
         
        this.rooms = {};
        this.#debug = false;
        this.commands = {};
        this.connections = {};

        this.disconnectTimeout = {};

        this.commands["enterRoom"] = this._enterRoom;
        this.commands["leaveRoom"] = this._leaveRoom;
        this.commands["chatMsg"] = (connection, data) => {
          this.sendChatMessage(connection.room, data.msg, connection);
        }

        // Subscribe and unsubscribe to event patterns
        this.commands["subscribe"] = this._subscribe;
        this.commands["unsubscribe"] = this._unsubscribe;

    }

    
    async upgrade(req, socket, head){
              
        var {sessionId, session} = await this.#getSessionOfReq(req);
        if(!session) {
          log.warn("Socket",`[WS] Session '${sessionId}' not found`);
          return false;     
        }
        var sessionTenant = session?.passport?.user?.tenantId;
        log.debug("WebSocket", `[WSH] Upgrade for '${session.passport.user.email}'`);
        if(this.#tenant.id !== sessionTenant){
          log.warn("Socket",`[WS] Session '${sessionId}' for '${sessionTenant}' cannot be used for tenant: '${this.#tenant.id}'!`);
          return false;
        }      
        this.addConnection(session, {socket: socket});


    }
    

    async #getSessionOfReq(req){

        if(!req.headers.cookie) return false;
        var cookieParts = req.headers.cookie.split('; ');
        var cookies = {};
        for(var x in cookieParts){
          var s = cookieParts[x].split("=");
          cookies[s[0]] = decodeURI(s[1]);
        }
          
        let sessionId = cookies["cloudcompose"] || '';        
        // only take the first part of the key (part until the ".")
        sessionId = sessionId.substr(0,sessionId.indexOf("."));
        sessionId = sessionId.substr(sessionId.indexOf("s%3A")+4);
                  
        return new Promise((resolve, reject)=>{

            // Session data:
            this.sessionStore.get(sessionId, (err, session)=>{
                if(session === undefined || session === null) resolve({sessionId: sessionId, session: false});
                if(err) reject(err);
                else {
                  session.sessionId = sessionId;
                  resolve({sessionId: sessionId, session: session});
                }
            });
        });

    }

    async __storeInSession(sid,key,value){

        return new Promise((resolve, reject)=>{
            this.sessionStore.get(sid, (err, session)=>{
                if(err) reject(err);
                session[key] = value;
                this.sessionStore.set(sid, session, (err)=>{
                    if(err) reject(err);
                    resolve();
                });            
            });
        });
    }
  
    
    addConnection(session, connection){
                     
        // WebSocket connected
        let sid = session.sessionId;

        connection.sid = sid;
        // overtake the session data :)
        try{
          connection.user = {
            id: session.passport.user.id,
            name: session.passport.user.username,
            email: session.passport.user.email
          };
        }catch(e){
          log.error("WebSocket", `Not yet logged in: ${session}`)
          return false;
        }
        
        if(this.connections[sid] !== undefined) connection.subscriptions = this.connections[sid].subscriptions;
        this.connections[sid] = connection;

        var msg = `[WS] Connected as user: ${connection.user.name} (${sid})`;
        log.debug("WebSocket", msg);
        
        // check for disconnectTimeouts for this SID
        if(this.disconnectTimeout[connection.sid] !== undefined){
          clearTimeout(this.disconnectTimeout[connection.sid]);
          delete this.disconnectTimeout[connection.sid];
          if(this.#debug === true) console.log("Removed disconnect timeout for:", connection.sid);
        }
        
        connection.socket.send(msg);  

        // Check if there is a room in the session of the user...
        if(session.room){         
            this._enterRoom(connection,{room: session.room});
        }
  
        // on close
        connection.socket.on("close",()=>{

          if(this.#debug === true) console.log("disconnect ",connection.sid);          
          if(this.#debug === true) console.log("After 15 seconds we will delete the SESSION of the user!")
          this.disconnectTimeout[connection.sid] = setTimeout(()=>{
            if(this.#debug === true) console.log(`Session deleted ${connection.sid}`);
              delete this.connections[connection.sid];              
          },15000);
          this._leaveRoom(connection, true);
                   
        });
        
        // on message
        connection.socket.on('message', message => {  
          // Try to json parse 
          try{
            message = JSON.parse(message);
          }catch(e){
            return this.__handleTextMsg(connection, message);
          }  
          return this.__handleJsonMsg(connection, message);
        })
    }
  
  
    __handleTextMsg(connection, message){
  
      if(this.#debug) console.log(connection.sid, message);
      
    }
  
    __handleJsonMsg(connection, data){
  
      if(this.#debug) console.log(connection.sid, data);
      if(!data.event) return;
      else if(data.event === "PING") {
        return connection.socket.send(this._prepareData("PONG", {}));
      }
      else if(typeof this.commands[data.event] == "function") {
        return this._returnSocketCall(data.event, connection, data.data, this.commands[data.event], data.callbackUUID);
      } else {
        log.warn("WebSocket", `Command '${data.event}' not registered?`)
      }
      this.emit(data.event, {data: data.data, user: JSON.parse(JSON.stringify(connection.user))});
  
    }


    async _returnSocketCall(event, connection, data, func, callbackUUID){

      let error = null;
      let returnValue = null;
      // run function
      try{
        returnValue = await func.apply(this,[connection,data]);
      }catch(err){
        log.error("WebSocket", err);
        error = err.message.toString();
      }      
      
      // if callback uuid given....
      if(callbackUUID){
        connection.socket.send(this._prepareData(event, {err: error, returnValue: returnValue}, callbackUUID));  
      } else {
        // errors are not send back as raw events
        if(error === null) connection.socket.send(this._prepareData(event, returnValue))
      }
    }
    


    _prepareData(event, data, callbackUUID){

      return JSON.stringify({
        event: event, 
        data: data,
        callbackUUID: callbackUUID
      });

    }


    /** Subscription handling */
    _eventRegExp(pattern) {
      let w = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // regexp escape 
      const re = new RegExp(`^${w.replace(/\*/g,'.*').replace(/\?/g,'.')}$`,'i');
      return re;    
    }

    emit(event, data){

      // check if this can be send for every connection!
      for(var x in this.connections){

        let con = this.connections[x];
        if(!con.subscriptions) continue;

        var match = false;
        for(var s in con.subscriptions){
          // check the event vs. the prepared RegExp of the subscription..
          if(con.subscriptions[s].test(event) !== false) {
            match = true;
            break;
          }
        }                
        if(match) this.sendToUser(con.sid, event, data);        
      }
        

    }

    _subscribe(connection, data){

      if(connection.subscriptions == undefined) connection.subscriptions = {};
      connection.subscriptions[data.event] = this._eventRegExp(data.event);
      
      if(this.#debug === true) console.log("Current subscriptions of user ",connection.user.name);
      if(this.#debug === true) console.log(connection.subscriptions);

      return "Subscribed to " + data.event;
      
    }

    _unsubscribe(connection, data){

      if(connection.subscriptions == undefined) return;
      if(connection.subscriptions[data.event]){
        delete connection.subscriptions[data.event];
        if(this.#debug === true) console.log("Current subscriptions of user ",connection.user.name);
        if(this.#debug === true) console.log(connection.subscriptions);
        return "Unsubscribed from " + data.event;
      } else {
        return "Not subscribed to " + data.event;
      }

    }

    _resetAllSubscriptions(connection, data){

    }



   
    
    broadcastRoom(room, event, data, connection){
  
      if(this.rooms[room]==undefined) return false;  
      var connectionIds = this.rooms[room].clients;
    
      for(var sid in connectionIds){
        var con = this.connections[sid];
        if(con == connection)continue; 
        // Broadcast to all others: 
        con.socket.send(this._prepareData(event, data))
      }
    }

    sendToUser(sessionId, event, data){ 
      if(this.connections[sessionId]) this.connections[sessionId].socket.send(this._prepareData(event, data));
    }    
    
    sendToUserById(userId, event, data){
      for(var x in this.connections){
        let c = this.connections[x];
        if(c.user && c.user.id === userId){
          c.socket.send(this._prepareData(event, data));
        }
      }
    }
  
    broadcast(event, data, connection){
  
      for(var x in this.connections){
        if(this.connections[x] == connection)continue; 
        // Broadcast to all others: 
        this.connections[x].socket.send(this._prepareData(event, data))
      }
    }
  
    // default commands
    async _enterRoom(connection,data){
      
      if(!data.room || connection.room === data.room) return false;
          
      // if any room before....
      await this._leaveRoom(connection);  
      if(this.rooms[data.room]==undefined)this.rooms[data.room]={clients:{}};
      connection.room = data.room;
      await this.__storeInSession(connection.sid,"room",data.room);
      this.rooms[data.room].clients[connection.sid]=true;
       
     
      this.broadcastRoom(data.room, 'enterRoomInfo', {"username":connection.name}, connection); 
      this.emit('enterRoom', {room: data.room, user: JSON.parse(JSON.stringify(connection.user))});
      this.sendToUser(connection.sid, "enterRoom", {room: data.room});

      return "You entered room " + data.room;
         
    }
  
    async _leaveRoom(connection, letSessionUntouched){
  
      if(connection.room == undefined) return false;

      // Tell the room...
      this.sendToUser(connection.sid, "leftRoom", {room: connection.room});
      this.broadcastRoom(connection.room, 'leftRoomInfo', {"username":connection.user.name}, connection);
           
      this.emit('leftRoom', {room: connection.room, user: JSON.parse(JSON.stringify(connection.user))});

      if(this.rooms[connection.room]!==undefined) delete this.rooms[connection.room].clients[connection.sid];
      if(Object.keys(this.rooms[connection.room].clients) == 0) delete this.rooms[connection.room];
      delete connection.room;
        
      // Remove from session (if not disconnected by error....)
      if(letSessionUntouched !== true) await this.__storeInSession(connection.sid,"room",undefined);     
    
      return "You left the room";
          
    }
  

    sendChatMessage(room, msg, connection){
      
      if(!this.rooms[room])return false;

      let data = {msg: msg};
      if(connection) data.username = connection.user.name;
      else data.system = "system";
           
      this.broadcastRoom(room,'chatMsg',data);

    }
   

  
    registerCommand(event, func){
      if(this.command[event]!==undefined) throw new Error("Command already defined:"+event);
      this.commands[event] = func;    
    }
}


module.exports = WebSocketHandler;


