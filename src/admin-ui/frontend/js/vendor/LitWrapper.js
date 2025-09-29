
class LitWrapper extends LitElement {
    
    // Rendering flag
    __readyForRendering = false;
    __initRun = true;
    

    constructor(){
      super();
      this.uuid = crypto.randomUUID();
    }

    // Do not use Shadow-Dom
    createRenderRoot() {
      return this;
    }

    /**  */
    connectedCallback() {
      super.connectedCallback()  
      this.afterConnectedCallback();
    }

    disconnectedCallback() {
      super.disconnectedCallback()  
      this.afterDisconnectedCallback();
    }

    // Empty for implement!
    async beforeRender(){};
    async afterRender(){};
    async afterRemoved(){};    

    async afterConnectedCallback(){
      await this.beforeRender();
      this.__readyForRendering = true;
      this.requestUpdate();
    }

    async afterDisconnectedCallback(){     
      this.afterRemoved();
    }
    
    async updated(data) {  
      if(this.__readyForRendering !== true) return;
      await this.afterRender();
      this.__initRun = false;
    }
        
    // Render the UI as a function of component state
    render(){
        if(this.__readyForRendering !== true) return html``;
    }
  }