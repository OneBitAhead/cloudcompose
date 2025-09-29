(function (w) {

    class Layout {

        #config = {
            appName: 'CloudCompose'
        };

        #session = {};
        #router;
        #refs = {};
        #mainTemplate = '';
        #menuItems = [];
        #currentModal;
        #availableLocales = {};

        get config() {
            return this.#config || {}
        }

        constructor(config) {


            console.log(` 📦 Cloud Compose Free (v${window.CLOUD_COMPOSE_VERSION})`);

            var logLevel = localStorage.getItem("logLevel");
            this.logLevel(logLevel || 0, true);

            Object.assign(this.#config, config || {});

            // set class in html class (if needed)

            this.setHTMLClasses(["set-header-fixed","set-nav-fixed", /*"set-nav-dark"*/]);

            // Initialize Navigo router
            this.#router = new Navigo("/", { hash: false });

            // Listen for route changes to update active link
            this.#router.hooks({
                after: (match) => {
                    this.setActiveLink(match)
                }
            });

            // Define routes
            this.#router.notFound(() => {
                this.showErrorTemplate(404, __('global:error_404'))
            })


            // Update links for Navigo
            this.#router.updatePageLinks();

            // Initial active link setup
            this.setActiveLink();

            // Force sidebar on small screens to vanish on click
            this.addSidebarEventListener()

        }

        setMainTemplate(content) {
            this.#mainTemplate = content;
        }

        setHTMLClasses(classes = []){
            for(var x in classes){
                document.documentElement.classList.add(classes[x]);
            }
        }


        #resetRefs() {
            const items = document.querySelectorAll('[data-ref]');
            this.#refs = {};
            Array.prototype.forEach.call(items, (item) => {
                let name = item.dataset.ref;
                this.#refs[name] = item;
            });           
        }

        getRef(name) {
            return this.#refs[name];
        }

        renderToRef(name, content) {
            if (this.#refs[name]) render(content, this.#refs[name]);
            else console.error("NoRef: ", name);
        }

        navigateTo(route) {
            this.#router.navigate(route);
        }

        showErrorTemplate(status, message){
            this.renderToRef("breadcrumbs", '');
            this.renderToRef("header", '');
            this.renderToRef("headerActions", '');
            
            if(status instanceof TemplateResult) {
                this.renderToRef("main", status);
            } else {
                this.renderToRef("main", html`<section style="height: 100%;display: grid; place-items:center"><div class="text-center"><h1 class="display-1">${status || 404}</h1><p>${message || 'Page not found.'}</p></div></section>`);
            }
            
        }


        // is called from modules BEFORE rendering the menu / resolve the router
        addRoute(url, module, callback, options) {           
            this.#router.on(url, (match) => {
                options = options || {};
                let adminOnly = !!options.adminOnly || false;
                if(!(adminOnly === true && this.isAdmin === false)){
                    callback(match);
                } else {
                    this.#router.navigate('/404');
                }
                
                
            })
        }
        addMenuItem(config){         
            // add to menu items         
            this.#menuItems.push({
                name: config.name, 
                type: config.type || "item", 
                url: config.url, 
                saIcon: config.saIcon, 
                position: config.position, 
                children: config.children || false, 
                adminOnly: config.adminOnly || false}
            );

        }



        // Simple function to update the #app content
        render(content) {
            try {
                render(content, document.getElementById('app'));
            } catch (e) {
                console.error('render error', e)
            }
        }

        toast(title, message, theme, timeout) {
            BootstrapToast.open(title, message, theme, timeout)
        }

        hideDialog(){
            
            if(this.#currentModal) {
                // clear body!
                var titleRef   = this.getRef("modal-title");
                var bodyRef    = this.getRef("modal-body");
                var buttonsRef = this.getRef("modal-buttons");

                // Empty
                render('', titleRef);
                render('', bodyRef);
                render('', buttonsRef);                

                this.#currentModal.hide();
            }
            
        }

        dialog(config) {

            config = config || {};

            var titleRef   = this.getRef("modal-title");
            var bodyRef    = this.getRef("modal-body");
            var buttonsRef = this.getRef("modal-buttons");

            // Empty first!
            render('', titleRef);
            render('', bodyRef);
                     
            // Then set it
            render(config.title || 'Title', titleRef);
            render(config.body || 'Body', bodyRef);

            // maybe parts to hide
            if(config.hideTitle) titleRef.parentElement.style.display = "none";
            else titleRef.parentElement.style.removeProperty("display");

            if(config.hideButtons) buttonsRef.style.display = "none";
            else buttonsRef.style.removeProperty("display");
            
            var modal = new bootstrap.Modal(document.getElementById('layoutModal'), {
                keyboard: (config.keyboard === false) ? false: true,
                backdrop: (config.backdrop !== "static") ? true : "static"
            })

            this.#currentModal = modal;         
            
            // buttons
            if(config.hideButtons !== true) this.setModalButtons(config.buttons);


            if (modal) modal.toggle();
            return modal;
        }

        setModalButtons(buttons){

            
        
            var modal = this.#currentModal;
            if(!modal) return;

            var buttonsRef = this.getRef("modal-buttons");
            render('', buttonsRef);

            var modalEl = document.getElementById('layoutModal');
            var modalBody = modalEl.querySelector('div.modal-body');
            var modalFooter = modalEl.querySelector('div.modal-footer');
                                      
            if(!buttons) buttons = [{name: "Close"}]
            else buttons = [].concat(buttons);
            var buttonsHtml = [];
            for(var x in buttons){
                let b = buttons[x];
                let callback = (b.callback) ? b.callback : ()=>{ return true; };
                buttonsHtml.push(html`<button @click=${async()=> {                    
                    var result = await callback(modalBody, modalFooter, b);
                    if(result !== false) modal.hide();
                }} class="btn ${b.type || 'btn-light'} btn-sm">${b.name}</button>`);
            }
            render(html`${buttonsHtml}`, buttonsRef);



        }


        addSidebarEventListener(){
            document.body.addEventListener("click", e => {

                let node = document.getElementById('main-wrapper');
                if(!node) return;

                if(node.classList.contains('show-sidebar') && node.clientWidth < 1200 && !e.target.classList.contains('i-sidebartoggler') && e.clientX > 300) {
                    let toggle = document.getElementById('sidebarCollapse');
                    if(toggle) toggle.click();
                }
            })
        }

        // Highlight active link
        setActiveLink(match) {

            var activeRoute = "/";
            if (match) activeRoute = `/${match.url}`;

            const links = document.querySelectorAll('#sidebarnav li');
            links.forEach(link => {

                const anchor = link.querySelector('a[data-navigo]');
                if (!anchor) return;

                anchor.classList.remove('active');
                if (anchor.pathname === activeRoute) {
                    anchor.classList.add('active');
                }
            });
        }

        async init() {

            // Check Session
            this.#session = await w.API.isLoggedIn();
                
            // will be redirected to a login route (stop here)
            if (!this.#session) return;

            // initial app given (from keycloak callback url)            
            var initialApp = localStorage.getItem("initialApp");
            // available locales
            this.#availableLocales = this.#session.locales;
                        
            
            if(initialApp){

                localStorage.removeItem("initialApp");
                // redirect to initial app now
                window.location = initialApp;
                return;

            } else {

                await this.#loadLocale(this.#session.locale || "en");
             
                // connect web socket (NO await !!!)
                this.connectWS();
                // 1) render main template                         
                render(this.#mainTemplate, document.body);
                this.#renderUserMenu();

                // mabye something to remove from mainTemplate?
                if(this.isAdmin === false){
                    document.querySelectorAll('[data-admin-only]').forEach(el => el.remove());
                }

                // 2) Calculate refs
                this.#resetRefs();
                // 3) set user data in header
                this.#setUserDataInHeader();
                // 4) init locales
                this.#initLocales();
                // 5) set menu
                this.#setMenu();
                // Finaly: Call init from template (e.g. menu for navigation is shown correctly)
                initTemplate();                       
                // Router resolves here (after either login or main page was rendered to the DOM)
                // or we do not have the correct base layout!!!
                // :)
                this.#router.resolve();
            }

        }



        #renderUserMenu(){

            var template = html`
                <a class="nav-link " href="javascript:void(0)" id="drop2" data-bs-toggle="dropdown"
                  aria-expanded="false">
                  <!--<img src="/img/avatar-admin.png"" alt="" width="35" height="35" class="rounded-circle">-->
                  <i class="ti ti-user-circle fs-7"></i>
                  <span data-id="header-identity" class="ms-2 d-none d-sm-block fs-3 fw-normal"></span>
                </a>
                <div class="dropdown-menu dropdown-menu-end dropdown-menu-animate-up p-0" aria-labelledby="drop2">
                  <div class="message-body">
                    <div class="dropdown-item d-sm-none">  
                      <div class="d-flex justify-content-between align-items-center"> 
                      <span data-id="header-user_email"></span><i class="ti ti-user-circle"></i> 
                      </div>
                    </div>
                    <div class="dropdown-divider m-0 d-sm-none"></div>
                    <a href="#" class="dropdown-item d-flex justify-content-between align-items-center py-3" @click=${()=>this.setPwd()}>
                        <span data-i18n="settings:menu.change_password">${__("settings:menu.change_password") || "Change Password"}</span> <i class="ti ti-lock"></i>                 
                    </a>
                    <div class="dropdown-multilevel dropdown-multilevel-left">
                        <div class="dropdown-item d-flex justify-content-between align-items-center  py-3">
                            <span data-i18n="settings:menu.language">${__("settings:menu.language") || "Language"}</span>
                            <i class="ti ti-chevron-right"></i>
                        </div>
                        <div class="dropdown-menu"  data-ref="language-submenu">
                            <!--<a href="#?lang=en" class="dropdown-item selected" data-action="lang" data-lang="en">English (US)</a>-->
                        </div>
                    </div>
                    
                    <a href="#" data-admin-only class="dropdown-item d-flex justify-content-between align-items-center py-3" @click=${()=>this.resetJobQueue()}>
                        <span data-i18n="settings:menu.reset_job_queue">${__("settings:menu.reset_job_queue") || "Reset Job Queue"}</span> <i class="ti ti-receipt-off"></i>                 
                    </a>

                    
                    <div class="dropdown-divider m-0"></div>
                    <a class="dropdown-item py-3 fw-500 d-flex justify-content-between" onClick="Layout.logout()" href="#">
                        <span class="text-danger" data-i18n="settings:menu.logout">${__("settings:menu.logout") || "Logout"}</span> <i class="ti ti-logout"></i>  
                        <!-- <span class="d-block text-truncate text-truncate-sm">@sunnyahmed</span> -->
                    </a>
                    <a href="#" class="dropdown-item d-flex justify-content-between align-items-center py-3" @click=${()=>this.getInfo()}>
                        <span data-i18n="settings:menu.about">${__("settings:menu.about") || "About"}</span> <i class="ti ti-info-circle"></i>                       
                    </a>
                  </div>
                </div>
                `;

                var userMenu = document.querySelector('li[data-id="userMenu"]');
                if(userMenu) render(template, userMenu);

        }



        #setMenu(){

            var menuEl = this.getRef("menu");
            var template = [];

                // Sort by position:
                this.#menuItems = this.#menuItems.sort((a, b)=>{
                    let posA = a.position || 1;
                    let posB = b.position || 1;
                    if(posA > posB) return 1;
                    else if(posA < posB) return -1;
                    else return 0;
                })

              

                for(var x in this.#menuItems){
                    let i = this.#menuItems[x];

                    // ONly render when permissions match
                    if(!(i.adminOnly === true && this.isAdmin === false)){
               
                        if(i.type === "title"){
                            template.push(html`<li class="nav-title"><span>${__(i.name)}</span></li>`);
                        } else {

                            // if children -> then NO href with navigo!
                            let href = (i.children) ? '#': i.url;

                            /* template.push(html`
                                <li>
                                <a href="${href}" data-navigo>
                                    <svg class="sa-icon">
                                        <use href="/img/sprite.svg#${i.saIcon}"></use>
                                    </svg>
                                    <span class="nav-link-text">${__(i.name)}</span>
                                </a>
                                ${(i.children) ? html`<ul>${i.children.map((i)=>{
                                    return html`<li class="">
                                        <a href="${i.url}"><span class="nav-link-text" data-i18n="">${__(i.name)}</span></a>
                                        </li>`;
                                })}</ul>`:''}
                            </li>`); */

                            template.push(html`<li class="sidebar-item">
                                <a class="sidebar-link" href="${href}" aria-expanded="false" data-navigo>
                                    <i class="ti ti-${i.saIcon}"></i>
                                    <span class="hide-menu">${__(i.name)}</span>
                                </a>
                            </li>`)
                        }  
                    
                    }

                    
                }
            

            if(menuEl) render(html`${template}`, menuEl);

        }        



        // After login set some data in the 
        // header (username, etc.)
        #setUserDataInHeader(){

            var avatar = document.querySelector('[data-id="header-avatar"]');
            var user_fullname = document.querySelector('[data-id="header-user_fullname"]');
            var user_email = document.querySelector('[data-id="header-user_email"]');
            var header_identity = document.querySelector('[data-id="header-identity"]');
            var profile_button = document.querySelector('[data-id="profile-button"]');
           
            if(avatar){
                avatar.setAttribute("alt", this.#session.username || this.#session.email);
            }
            if(user_fullname){
                render(this.#session.username,user_fullname);
            }
            if(user_email){
                render(this.#session.email,user_email);
            }
            if(header_identity){
                render(this.#session.username || this.#session.email, header_identity);
            }
            if(profile_button){
                render(html`<span class="avatar-circle bg-primary text-white">${ (this.#session.username || this.#session.email).substring(0, 1).toUpperCase() }</span>`, profile_button);
            }

        }



        //############### i18n #####################################
        /**
         * Check for loaded locales and show dropdown 
         *  
         */
        #initLocales(){

            var localeItems = [];            
            for(var x in this.#availableLocales){                    
                let loc = this.#availableLocales[x];
                let active = (this.#session.locale === x) ? 'active': '';
                localeItems.push(html`<li>
                    <a class="dropdown-item ${active}" href="#" data-lang="${x}"> ${loc.name} </a>
                </li>`);                
            }

            
            // Locale dropdown
            var languageDrop = this.getRef("language-drop");
            if(languageDrop){             
                var template = html`
                    <button class="btn btn-outlined dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="flag-icon flag-icon-gb me-2"></span> ${this.#availableLocales[this.#session.locale]?.name}
                    </button>
                
                    <ul data-ref="language-drop" class="dropdown-menu" aria-labelledby="languageDropdown">
                        ${localeItems}                       
                    </ul>`
                    render(template,languageDrop);

                    languageDrop.querySelectorAll('.dropdown-item').forEach(item => {
                        item.addEventListener('click', event => {
                            event.preventDefault(); // prevent default link behavior
                            const selectedLang = item.getAttribute('data-lang'); // read language code                            
                            this.switchLanguage(selectedLang);
                        })
                    });
            }

            // Language submenu
            var languageSubMenu = this.getRef("language-submenu");
            if(languageSubMenu) {
                 var template = html`${localeItems}`
                 render(template, languageSubMenu);

                 languageSubMenu.addEventListener( 'click', e => {                     
                     if(!e.target.matches('a[data-lang]')) return;
                     e.preventDefault();
                     const selectedLang = e.target.getAttribute('data-lang'); // read language code                          
                     this.switchLanguage(selectedLang);
                 })
            }
        }

        async #loadLocale(locale){

            var {result, status} = await API.get(`/api/locales/${locale}`);
            i18next.init({
                lng: locale,
                debug: false,
                fallbackLng: "en",
                resources: {[locale]:result}
            });       

            // There may be prerendered nodes that need translation
            requestAnimationFrame( _ => {  

                try {
                    var nodes = document.querySelectorAll('[data-i18n]');
                    if(nodes.length > 0){
                        [...nodes].forEach((node) => {
                            let key = node.dataset.i18n;
                            node.textContent = __(key)
                        });
                    }
                } catch(e){}
            })

        }
     
        async switchLanguage(locale, silent) {
            await API.put(`/api/users/${this.#session.id}/switchLocale`,{locale: locale});
            window.location.reload();            
        }
        
        // end-of-i18n


        logLevel(number, silent){   
            
            let desc = {
                0: "Fatal and Error",
                1: "Warnings",
                2: "Normal logs",
                3: "Informational logs, success, fail, ready, start, ...",
                4: "Debug logs",
                5: "Trace logs",
                "-999": "Silent",
                "+999": "Verbose logs"
            }
            
            if(desc[number] === undefined){
                console.error("Consola has these levels:", JSON.stringify(desc, null,3));
                return;
            } 
            consola.level = number; 
            console.log("[Consola] Set log level:", desc[number]);
                    
            /*
            consola.info("Using consola 3.0.0");
            consola.start("Building project...");                        
            consola.warn("A new version of consola is available: 3.0.1");
            consola.success("Project built!");
            consola.error(new Error("This is an example error. Everything is fine!"));
            */

            if(!silent) localStorage.setItem("logLevel", number);


        }




        get username (){
            return this.#session.username;
        }
        get isAdmin(){
            return this.#session.isAdmin;          
        }


        getInfo(){

            var template = html`<p>CloudCompose (v${window.CLOUD_COMPOSE_VERSION}) is a product of <a href="https://www.onebitahead.com" target="_blank">OneBitAhead GmbH</a>.</p>

            <p>CloudCompose uses the <a href="https://themewagon.com/themes/flexy/" target="_blank">Flexy Template</a>, designed and developed by <a href="https://www.wrappixel.com/"  target="_blank" class="">Wrappixel.com</a>, distributed by <a href="https://themewagon.com" target="_blank">ThemeWagon</a>.</p>
            `;

            this.dialog({
                title: __("global:Info"),
                body: template,
                buttons: [{ name: __("global:button_ok") }]

            })
        }


        
        async setPwd(userId) {

            
            if(!userId) userId = this.#session.id;
            

            var template = html`
            <form>                
                <div class="mb-3">
                    <label class="form-label" for="password">${__("users:password")}</label>
                    <input type="password" id="password" name="password" class="form-control" placeholder="${__("users:password")}">
                </div>                
                <div class="mb-3">
                    <label class="form-label" for="password_repeat">${__("users:password_repeat")}</label>
                    <input type="password" id="password_repeat" name="password_repeat" class="form-control" placeholder="${__("users:password_repeat")}">
                </div>                     
            
            </form>`;

            this.dialog({
                title: __("users:dialog_set_password"),
                body: template,
                buttons: [{
                    name: __("global:button_save"), callback: async (modal) => {

                        var form = modal.querySelector("form");
                        var password = form.querySelector("#password").value;
                        var password_repeat = form.querySelector("#password_repeat").value;

                        if(password.trim() === "" || password !== password_repeat) {
                             var errorContainer = modal.querySelector(".error");
                            if (!errorContainer) {
                                    const newChild = document.createElement("div");
                                    newChild.className = 'error alert alert-danger';
                                    newChild.textContent = "Non matchin passwords";
                                    modal.insertBefore(newChild, modal.firstChild);
                            }
                            return false;
                        }

                        var { status, result: data } = await w.API.put("/api/users/" + userId + "/password", {
                            password: password
                        });

                        if (status === 200) {                        
                            return true;
                        } else {
                            if (data && data.error) {

                                var errorContainer = modal.querySelector(".error");

                                if (!errorContainer) {
                                    const newChild = document.createElement("div");
                                    newChild.className = 'error alert alert-danger';
                                    newChild.textContent = data.error;

                                    modal.insertBefore(newChild, modal.firstChild);

                                } else {
                                    errorContainer.textContent = data.error;
                                }


                            }

                            return false;
                        }



                    }
                }, { name: __("global:button_cancel") }]

            })


        }


        async resetJobQueue() {


    
            this.dialog({
                title: __("installation:dialog_reset_job_queue"),
                body: __("installation:dialog_reset_job_queue_text"),
                buttons: [{
                    name: __("global:button_ok"), callback: async (modal) => {

                        var { status, result: data } = await w.API.delete("/api/queue");

                        if (status === 200) {                        
                            return true;
                        } else {

                            if (data && data.error) {

                                var errorContainer = modal.querySelector(".error");

                                if (!errorContainer) {
                                    const newChild = document.createElement("div");
                                    newChild.className = 'error alert alert-danger';
                                    newChild.textContent = data.error;

                                    modal.insertBefore(newChild, modal.firstChild);

                                } else {
                                    errorContainer.textContent = data.error;
                                }


                            }

                            return false;
                        }



                    }
                }, { name: __("global:button_cancel") }]

            })


        }
      
      


        async connectWS() {
            try {
                var socket = new WSConnection();
                window.socket = socket;
                await socket.connect()
            } catch (e) {
                console.error("WS:", e);
            }
        }

        logout() {
            window.location = "/logout";
        }

        // Waiter
        waitFor(check,callback) {
            var interval = setInterval(function() {
                if ( check() === true ) {
                clearInterval(interval);
                callback();
            }
            }, 200);
        };

        

    }

    window.__ = (key, variables) => {
        if (!key) return "";        
        variables = variables || {};
        var parts = key.split(":");
        if (parts.length === 2) {
            variables.ns = parts[0];
            return i18next.t(parts[1], variables)
        } else {
            return i18next.t(key, variables)
        }
    }

    window.__exists = (key) => {
        if (!key) return false;
        var variables = {};
        var parts = key.split(":");
        if (parts.length === 2) {
            variables.ns = parts[0];
            return i18next.exists(parts[1], variables)
        } else {
            return i18next.exists(key, variables)
        }
    }

   
    
    w.Layout = new Layout();



})(window);
