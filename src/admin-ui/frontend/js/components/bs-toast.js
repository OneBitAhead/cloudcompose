class BootstrapToast extends HTMLElement {

    constructor(){
        super();
    
    }

    static open(title, message, theme, timeout){

        var element = document.createElement('bs-toast');
        element.title = title;
        element.message = message;
        if(theme) element.theme = theme;

        // check for container
        var container = document.querySelector('.toast-container');
        if(!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container)
        }

        container.appendChild(element)

        if(timeout) {
            window.setTimeout( _ => { element.remove(); } , timeout)
        }

    }

    connectedCallback(){

        let themeClasses = (['primary', 'secondary', 'success', 'danger', 'warning', 'info'].includes(this.theme || '')) ? `text-white bg-${this.theme}` : '';

        this.innerHTML = `<div class="toast fade show ${themeClasses} mb-4" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <!--<img src="img/logo.png" alt="brand-logo" height="16" class="me-2">-->
                <strong class="me-auto">${this.title}</strong>
                <small class="d-none"></small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close" onclick="this.closest('bs-toast').remove()"></button>
            </div>
            <div class="toast-body">${this.message}</div>
        </div>`

    }

    disconnectedCallback(){
        // Remove container
        var container = document.querySelector('.toast-container');
        if(container && container.childElementCount === 0) container.remove();
    }

    static get observedAttributes() {
        return ['title', 'message', 'theme'];
    }

    // attributeChangedCallback(name, oldValue, newValue) {
    //     this[name] = newValue;
    // }

}

window.customElements.define('bs-toast', BootstrapToast);

// Set styles
(function (w, d) {

    let style = d.createElement('STYLE');
    style.textContent = `.toast-container { position: fixed; top: 1rem; right: 1rem;}

    bs-toast [class^="bg-"] .toast-header, 
    bs-toast [class*=" bg-"] .toast-header {
        color: currentColor;
        background-color: inherit;
    }
    bs-toast [class^="bg-"] .toast-body, 
    bs-toast [class*=" bg-"] .toast-body {    
        color: var(--bs-toast-header-color);
        background-color: var(--bs-toast-header-bg);
    }
    bs-toast [class^="bg-"] .btn-close, 
    bs-toast [class*=" bg-"] .btn-close {
        filter: var(--bs-btn-close-white-filter);
        opacity: 1
    }
    
    `

    d.head.appendChild(style);
})(window, document);