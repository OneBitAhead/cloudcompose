(function(w){

    class API{

        #session = null;

        constructor(){
        }

        async isLoggedIn(){

            if(this.#session) return this.#session;
            var {result} = await this.get("/api/loggedIn");

            if(result.error && result.goTo) {
                // Maybe parameter app provided (from keycloak callback)
                var u = new URL(window.location);
                var app = u.searchParams.get("app");  
                if(app){
                    localStorage.setItem("initialApp", app);
                } else {
                    localStorage.removeItem("initialApp");
                }                                
                window.location = result.goTo;     
                return false;
            }

            this.#session = result;
            return this.#session;            
        }
        
        async get(route, payload, signal){
            return await this.#request('GET', route, payload, signal)
        }

        async post(route, payload){
            return await this.#request('POST', route, payload)
        }

        async put(route, payload){
            return await this.#request('PUT', route, payload)
        }

        async delete(route, payload){
            return await this.#request('DELETE', route, payload)
        }

        async formPost(route, formData){
            return await this.#request('RAW_POST', route, formData)
        }

  
        async #request(method, route, payload, signal){
            
            method = (method || 'GET').toUpperCase();

            var body = null;
            const myHeaders = new Headers();
            if(['POST','PUT','DELETE'].includes(method)) {
                myHeaders.append("Content-Type", "application/json");
                if(payload) {
                    body = JSON.stringify(payload)
                }                
            } else if( method === 'GET' && payload){
                route += "?" + new URLSearchParams(payload);
            }

            // raw post (e.g. for file upload...)
            if(method === "RAW_POST") {
                method = "POST";
                body = payload;
            }
            
            var params = {
                method: method,
                headers: myHeaders,
                body: body
            };
            if(signal) params.signal = signal;

            const myRequest = new Request(route, params);

            

            var response = await fetch(myRequest);
            var result = null;

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();  // parse JSON body
            } else {
                result = await response.text();  // parse as plain text
            }

            var headers = {};
            for (const pair of response.headers.entries()) {
                headers[pair[0]] = pair[1];
             }
         
            return {status: response.status, headers: headers, result: result};

        }



        async hashString(message) {
            // Convert the string to a Uint8Array
            const msgBuffer = new TextEncoder().encode(message);
            // Hash the message
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            // Convert ArrayBuffer to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }


        poll(url, onData, onError, signal, intervalMs ) {

            intervalMs = intervalMs || 1000;

            async function doPoll() {
                if (signal.aborted) return; // stop if aborted

                try {
                    const response = await w.API.get(url, null, signal);
                    if (response.status >= 400) throw new Error(`HTTP error! status: ${response.status}`);
                    onData(response.result);
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        onError(error);
                    }
                    return; // stop polling on fetch errors except abort
                    }

                if (!signal.aborted) {
                    setTimeout(doPoll, intervalMs);
                }
            }

            doPoll();
        }

    }

    w.API = new API();

})(window)