(function(w){
    
    class InstallationQueue {

        #configuration = {
            toggle: null,
            toggleClass: 'active',
            panel: null,
            sidebar: null
        };

        #data;
        #active;

        #listeners;
        #listening;
        #abortController;

        get data(){ return this.#data}
        get configuration() { return this.#configuration}

        constructor(configuration){

            // Pass configuraion
            if(configuration) this.config(configuration);

            this.#data = [];
            this.#active = true;        // whether to update UI
            this.#listening = false;    // whether to listen to changes

            this.#listeners = {};


            /**
             * The WebSocket is a TCP Connection that will be disconnected / reconnected by design
             * as Docker flushes connections when containers are added to or removed from the network.
             * Consecutively, the frontend is likely to miss socket updates.
             * 
             * To deal with that the socket is replaced by polling
             */

            // Listen to socket
            // this.initListeners();

        }

        configure( configuration ){
            configuration = configuration || {};

            // Map keys from configuration
            Object.keys(this.#configuration).forEach( key => {
                if(configuration[key] !== undefined) this.#configuration[key] = configuration[key];
            })
        }

        setToggleState( state ){

            let toggleElement = document.querySelector(this.#configuration.toggle);
            if(!toggleElement) return;

            toggleElement.classList[ state === true ? 'add' : 'remove'](this.#configuration.toggleClass);

        }

        /*
        async initListeners(){

            // Subscribe to socket messages
            if(!w.socket){

                Layout.waitFor( () => { return typeof globalThis.socket !== 'undefined' && globalThis.socket.connection.readyState === 1 }, _ => {

                    w.socket.on(`queue:*:*:*`, async (event, data)=>{

                        // Broadcast 
                        document.body.dispatchEvent( new CustomEvent('queue-installation-message', { detail: data, bubbles: true, cancelable: true } ) );

                        const id = data.id;
                        const index = this.#data.findIndex( d => { return d.status !== 'success' && id === d.id});

                        // Merge event data into stored data
                        if(index === -1) {
                            this.#data.push(data);
                        } else {
                            this.#data[index] = data;
                        }

                        const todo = this.#data.filter( d => { return d.status !== 'success'} )
                        this.setToggleState(todo.length > 0)

                        this.render();
                        
                    });
                })

            }


            var { result: data } = await w.API.get(`/api/queue`);               
            this.render();

            Layout.waitFor( () => { return this.#configuration.sidebar !== null && document.querySelector(this.#configuration.sidebar) != null }, _ => {

                const targetElement  = document.querySelector(this.#configuration.sidebar);

                let lastClassString = targetElement.className;

                const observer = new MutationObserver((mutationsList) => {
                    mutationsList.forEach(mutation => {
                        if (mutation.attributeName === "class") {
                            const currentClassString = targetElement.className;
                            // Check if "open" class was added
                            if (!lastClassString.includes('open') && currentClassString.includes('open')) {
                                
                                // Ensure the i18n headline is set
                                try {
                                    targetElement.querySelector('span.title').textContent = __('installation:headline')
                                } catch(e){}
                                
                                this.#active = true;
                                this.render();

                            } else {
                                this.#active = false;
                                // Remove successful installation
                                this.#data = this.#data.filter( d => { return d.status !== 'success'} )
                                this.setToggleState(this.#data.length > 0)
                            }
                            lastClassString = currentClassString;
                        }
                    });
                });

                observer.observe(targetElement, { attributes: true, attributeFilter: ['class'] });
                

            })

        }
            */

        startListening(){

            if(this.#listening === true) return;

            this.#listening = true;

            this.#abortController = new AbortController();

            w.API.poll(
                `/api/queue`,
                data => {    
                    
                    if(!data || !data.records) { this.#abortController.abort(); }

                    // Convert resulting records to structure needed to render
                    this.#data = data.records || [];

                    let pendingJobs = (this.#data || []).filter( e => e.status && !['error','success'].includes(e.status));

                    if( pendingJobs.length === 0) {
                        this.stopListening();
                    }


                    this.render();

                },
                error => {                          
                    
                    reject(e);

                },
                this.#abortController.signal
            );

        }

        stopListening(){

            if(this.#listening != false) this.#listening = false;

            if(this.#abortController) {
                this.#abortController.abort();
                this.#abortController = null;
            }

        }

        async clearQueue(){
            return w.API.delete('/api/queue');
        }

        addListener( filter, fn ) {
            if(!this.#listeners[filter])  this.#listeners[filter] = [];

            const uuid = this.#generateUUID();
            this.#listeners[filter].push({uuid: uuid, fn: fn});
            return uuid;

        }

        removeListenerByUUID(uuid){
           
        }


        #generateUUID() {
            let d = new Date().getTime();
            if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
                d += performance.now(); // use high-precision timer if available
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Render placehlder when no jobs a queued
        renderEmpty(){
            var panel = document.querySelector(this.#configuration.panel);
            if(!panel) {
                return;
            }
            render( html`<section class="h-100 d-grid" style="place-items:center">
                
                 <div class="text-center text-success">
                    <i class="ti ti-check"></i>  
                    <span class="fs-xl p-3">${__('installation:done') || "Done"}</span>
                  </div>

                </section>`, panel)
        }

        render(){

            // Only render when panel exists and is visible 
            if(this.#active !== true) return;
            var panel = document.querySelector(this.#configuration.panel);
                        
            if(!panel) {               
                return;
            }

            // Get list of relevant jobs and update ui
            let jobs = (this.#data || []).filter( e => e.status /*&& e.status !== 'success'*/)
            let pendingJobs = (this.#data || []).filter( e => e.status && !['error','success'].includes(e.status))


            this.setToggleState(pendingJobs.length > 0)

            if(pendingJobs.length === 0){
                this.renderEmpty();
                return;
            }

            const states = {
                'waiting': {className: 'border border-secondary text-secondary', name: __('installation:states.waiting') }, 
                'running': {className: 'bg-warning', name: __('installation:states.running')  },
                'error': {className: 'bg-danger', name: __('installation:states.error')  },
                'success': {className: 'bg-success', name: __('installation:states.success')  },
                'fallback': {className: 'bg-info' }
            }

            // Render list of relevant jobs
            render( html`<ul class="m-0 list-group list-group-flush">
                ${jobs.map( e => { 

                    let state = states[e.status].className || states.fallback.className;

                    var context = e.context; 
                    try { if(typeof context === 'string') context = JSON.parse(context); } catch(e){  }

                    return html`<li class="list-group-item">
                        <small>${__(`installation:commands.${e.cmd}`)}</small>
                        <h6 class="mb-0">${context.name || e.id}</h6>
                        <span class="me-2 badge ${state}">${ states[e.status].name || e.status}</span> 
                        ${e.subStatus ? __('global:' + e.subStatus): ''}
                    </li>`;                    
                    
                })}
                </ul>`, panel )

        }

    }
    w.InstallationQueue = new InstallationQueue();
    
})(window)