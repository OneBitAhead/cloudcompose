(function(w){
    

    class Tabs {

        #uuid;
        #element;
        #tabs;
        #activeTab;
        #scope;

        constructor(configuration){

            this.#uuid = crypto.randomUUID();

            this.#scope = configuration.scope || this;

            if(configuration.active) this.#activeTab = configuration.active;
            this.#tabs = {};

            for(var x in configuration.tabs){
                let t = configuration.tabs[x];
                if(!this.#activeTab) this.#activeTab = t.id;
                this.#tabs[t.id] = {
                    id: t.id,
                    name: t.name,
                    content: t.content,
                    afterRendered: t.afterRendered,
                    afterLeaving: t.afterLeaving
                }
            }
            
            // maybe an active tab via # in url!
            let urlActiveTab = window.location.hash.replace(/^#tab=/, '');
            if(urlActiveTab && this.#tabs[urlActiveTab] !== undefined){
                this.#activeTab = urlActiveTab;
            }

            this.#element = (typeof configuration.el === "string") ? document.querySelector(configuration.el): configuration.el;
                                     

        }

        get activeTab(){
            return this.#activeTab
        }

        get uuid() {
            return this.#uuid;
        }

        activateTab(tabId){
            // emulate click!
            var liEl = document.querySelector(`button[data-id="${this.#uuid}_button_${tabId}"]`);
            liEl.click();         
        }


        async #activateTab(tabId){

            window.location.hash = `#tab=${tabId}`;

            // active before...
            var beforeContentEl = document.getElementById(`${this.#uuid}_${this.#activeTab}`);
            if(beforeContentEl) render('',beforeContentEl);

            this.#activeTab = tabId;
            var contentEl = document.getElementById(`${this.#uuid}_${tabId}`);
       
            var t = this.#tabs[tabId];
            let content = (typeof t.content !== "function") ? html`${t.content}`: (tabId === this.#activeTab) ? await t.content.apply(this.#scope,[]): '';

            // Always add a wischmop :)
            content = html`<custom-wischmop .afterRemoved=${() => this.#leavingTab(tabId)}>></custom-wischmop>${content}`;


            if(contentEl){
                render(content, contentEl);
                if(typeof t.afterRendered === "function") t.afterRendered.apply(this.#scope,[]);
            }
            

        }

        async #leavingTab(tabId){

            var t = this.#tabs[tabId];                        
            if(typeof t.afterLeaving === "function") t.afterLeaving.apply(this.#scope,[]);


        }
        

        render( ){

            // render a tab container
            var tabs = [];
            var contents = [];
        
            for(var tabId in this.#tabs){
                let t = this.#tabs[tabId];
             
                let activeClass = (tabId === this.#activeTab) ? 'active show': '';
                // Tab
                tabs.push(html`<li  class="nav-item" @click=${()=>{this.#activateTab(t.id)}} role="presentation">
                                <button data-id="${this.#uuid}_button_${tabId}" class="nav-link ${activeClass}" id="tab_${tabId}" data-bs-toggle="tab" data-bs-target="#${this.#uuid}_${t.id}" 
                                type="button" role="tab" aria-controls="home" aria-selected="true">${t.name}</button>
                              </li>`)               
                contents.push(html`
                     <div class="tab-pane fade ${activeClass}" id="${this.#uuid}_${t.id}" role="tabpanel" aria-labelledby="${t.id}-tab">
                    </div>
                    `);
            }


            var template = html`
                <ul class="nav nav-tabs nav-tabs-clean" id="${this.#uuid}" role="tablist">
                    ${html`${tabs}`}                   
                </ul>
                <!-- content -->
                <div class="tab-content" id="TabContent">
                    ${html`${contents}`}
                </div>`;


            setTimeout(()=>{
                this.#activateTab(this.#activeTab);
            },10)

            if(this.#element) render(html`${template}`,this.#element);
            else return html`${template}`;
            
        }


    }

    w.Tabs = Tabs;

    
})(window)