class Wischmop extends LitWrapper {

    // you can either set this callback like this
    //
    // 1) in javascript (DOM)
    // var wischmop = document.querySelector("custom-wischmop");
    // wischmop.afterRemoved = ()=>{....}
    //
    // 2) in a lit render method
    // render(html`Bla blubb <custom-wischmop .afterRemoved=${()=>{}}></custom-wischmop>`, dom-elemnent
    //
    afterRemoved(){
        consola.debug("WISCHMOP: no afterRemoved function set")
    }

    render(){
        return null;
    }
    
}

customElements.define('custom-wischmop', Wischmop);


