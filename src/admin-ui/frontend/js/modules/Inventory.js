(function (w) {

    class InventarModule {

        #tabs;
        #showAllInstalledApps;
        #hasBillingAddress;

        #states = [
            { severity: 0, color: 'success', states: ['running', 'healthy'] },
            { severity: 1, color: 'warning', states: ['starting'] },
            { severity: 2, color: 'danger', states: ['exited'] },
            { severity: 3, color: 'info', states: ['out-of-sync'] }

        ]

        #getState(displayState) {

            if (!displayState) return {};
            return this.#states.filter(s => s.states.includes(displayState))[0];
        }

        get name() { return __("inventory:moduleName") }

        constructor() {

            this.#hasBillingAddress = true;

            // default: only show apps of user, if permission is set
            var showAllApps = localStorage.getItem("inventory_show_all_apps");
            this.#showAllInstalledApps = (showAllApps === "true") ? true : false;

            w.Layout.addRoute('/', this, (match) => {
                this.render(match);
            })

            w.Layout.addMenuItem({
                position: 1,
                name: "apps:moduleName",
                url: "/",
                saIcon: "layout-grid"
            });

            globalThis.INV = this;

        }

        #leavingModule() {
            // remove events !
            try {
                socket.off(`endpoint:*:*`);
            } catch (e) {
                consola.error(e)
            }
        }

        #toggleInstalledApps() {

            var showAllApps = localStorage.getItem("inventory_show_all_apps");
            if (showAllApps === "true") {
                this.#showAllInstalledApps = false;
                localStorage.setItem("inventory_show_all_apps", false);
            } else {
                this.#showAllInstalledApps = true;
                localStorage.setItem("inventory_show_all_apps", true);
            }

            this.#tabs.activateTab("installed_apps")


        }

        async #getInstalledApps() {
            var data = await w.API.get(`/api/instances/appsOfUser`);
            if (data && data.status >= 400) {
                throw new Error(data.status);
            }

            return data.result;
        }


        async #getAvailableApps() {
            var { result: data } = await w.API.get(`/api/app_blueprints`, {hostname: window.location.hostname});
            return data;
        }


        async #addBillingAddress() {

            return new Promise((resolve, reject) => {

                // Verify action
                Layout.dialog({
                    title: __('settings:billing_address.headline'),
                    body: html`
                    <div class="position-relative">
                        <style>
                            #billing-addres-alert { top: 0; left: 0; right: 0}
                            #billing-addres-alert:empty { display: none !important }
                            form.small-placeholder .form-control::placeholder { font-size: .8rem; opacity: .5}
                        </style>
                        <div class="alert alert-warning position-absolute" role="alert" id="billing-addres-alert"></div>

                        <section class="d-flex flex-row gap-4 align-items-center">
                            <span style="min-width: 2.1875rem"><i class="ti ti-home"></i></span>
                            <p class="flex-fill mb-0">${__('settings:billing_address.description')}</p>
                        </section>
                        <section class="mt-4">
                            <form class="small-placeholder">
                                
                                <div class="row mb-3 align-items-center">
                                    <label for="company" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.name')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="name" required placeholder="${__('settings:billing_address.fields.name_placeholder')}">
                                    </div>
                                </div>

                                <div class="row mb-3 align-items-center">
                                    <label for="company" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.vat')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="vat" required placeholder="${__('settings:billing_address.fields.vat')}">
                                    </div>
                                </div>
                                
                                <div class="row mb-3 align-items-center">
                                    <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.street')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="street" placeholder="${__('settings:billing_address.fields.street')}" required>
                                    </div>
                                </div>
                                
                                <div class="row mb-3 align-items-center">
                                    <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.zipcode')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="zipcode" placeholder="${__('settings:billing_address.fields.zipcode')}">
                                    </div>
                                </div>

                                <div class="row mb-3 align-items-center">
                                    <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.city')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="city" placeholder="${__('settings:billing_address.fields.city')}">
                                    </div>
                                </div>

                                
                                <div class="row mb-3 align-items-center">
                                    <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.country')}</label>
                                    <div class="col-sm-9">
                                    <input type="text" class="form-control" id="country" placeholder="${__('settings:billing_address.fields.country')}">
                                    </div>
                                </div>

                                <div class="row mb-0 align-items-center">
                                <small class="text-muted px-3 mt-2">${__('settings:billing_address.fields.additional_description')} </small>
                                </div>

                                <div class="row mb-3 align-items-center">
                                    <label for="additionalInfo" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.additional')}</label>
                                    <div class="col-sm-9">
                                    <textarea class="form-control" id="additionalInfo" rows="3" placeholder="${__('settings:billing_address.fields.additional')}"></textarea>
                                    </div>
                                </div>
                                
                                </form>

                        </section>
                    </div>
                    `,
                    buttons: [
                        { name: __('global:button_cancel'), callback: () => { Layout.hideDialog(); resolve(false) } },
                        {
                            name: __('settings:billing_address.save_address'), type: 'btn-primary', callback: async (modal) => {

                                const form = modal.querySelector('form');
                                const formElements = form.elements;

                                const formDataObj = {};

                                for (let element of formElements) {
                                    if (element.id) {
                                        formDataObj[element.id] = element.value;
                                    }
                                }

                                // Basic checking
                                if ((formDataObj.name || '').trim() === '' && (formDataObj.additionalInfo || '').trim() === '') {
                                    const alert = modal.querySelector('#billing-addres-alert');
                                    if (alert) alert.innerText = __('settings:billing_address.mandatory_fields')
                                    return false;
                                }

                                // Sync to API
                                const checkAddress = await w.API.post(`/api/settings/`, { key: 'billing_address', value: formDataObj });

                                // resolve(true);
                                resolve(checkAddress.status < 400);
                            }
                        }
                    ]
                }
                )

            })


        }


        async #create(app, event) {

            if (!Layout.isAdmin) return false;
            event.stopImmediatePropagation();

            var button = event.target;
            if (button) button.disabled = true;

            // Check whether billing address exists
            if (this.#hasBillingAddress !== true) {

                const checkAddress = await w.API.get(`/api/settings/check/billing_address`);

                var isDefined = false;
                if (checkAddress && checkAddress.status == 200) {

                    if (checkAddress.result && checkAddress.result.isDefined === true) {
                        isDefined = true;
                    }
                }

                if (isDefined !== true) {
                    var billingAddress = await this.#addBillingAddress();

                    if (billingAddress === false) {
                        if (button) button.disabled = false;
                        return false;
                    }

                    if (billingAddress === true) this.#hasBillingAddress = true;
                } else {
                    // Remember for later
                    this.#hasBillingAddress = true;
                }
            }


            // Billing Address exists, show create dialog

            var template = html`<section class="d-flex flex-row gap-4 align-items-center">
                    <span style="min-width: 2.1875rem"><i class="fs-10 ti ti-rocket"></i></span>
                    <div class="flex-fill mb-0">
                        <div>
                        ${unsafeHTML(__('apps:install.verify', { app: app.name }))}
                        </div>

                        ${ (typeof app.post_install_route === 'string' && app.valid_certificate !== true) ? html`<div class="alert alert-warning d-flex align-items-center mt-4 gap-3" role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                            </svg>
                            <div>
                                ${unsafeHTML(__('apps:install.certificate_required'))}
                            </div>
                        </div>` : ''}
                            
                    </div>
                    </section>
                    
                    <section class="post_install d-none">
                        <p>${unsafeHTML(__('installation:post_install'))}</p>
                        <iframe class="d-none" src="" width="400" height="200" title="Post Install Iframe"></iframe>
                    </section>`

            const periods = {
                '1m': 'Monthly',
                '3m': 'Quarterly',
                '6m': 'Semiannual',
                '12m': 'Annual'
            }

            if (Array.isArray(app.products) && app.products.length > 0) {
                template = html`${template}
                <form class="flex-fill" style="overflow-y:auto">
                ${app.products.map((condition, index) => html`<div class="card m-auto mb-2 d-flex flex-row p-2 align-items-center gap-3" style="width: 100%">
                        <div class="flex-fill">
                            <div><span class="text-nowrap">${__(`invoices:billing_periods.${condition.billing_period}`)}</span> <span class="text-nowrap">${__(`invoices:number_of_users`, { number_of_users: condition.number_of_users })}</span></div>
                            <small class="text-muted hide-when-empty">${condition.description || ' '}</small>
                        </div>
                        
                        <div class="flex-fill" style="text-align: right">
                            <b class="fs-xl d-block text-nowrap">${condition.price}€</b> 
                            <small class="text-muted d-block">${condition.price_per_unit}€ ${__(`invoices:per_month_and_user`)}</small>
                        </div>
                        <div>
                            <input type="radio" class="form-check-input" id="product" value="${condition.identifier}" name="product" .checked=${index === 0}>
                        </div>
                    </div>`)}
                </section>`
            }

            consola.debug('app', { app })

            // Verify action
            Layout.dialog({
                title: __('apps:install.headline'),
                body: html`<style>.modal-body:has(section.own_scrolling){overflow:hidden}</style><section class="own_scrolling d-flex flex-column gap-3" style="max-height: 450px;overflow:hidden">${template}</section>`,
                backdrop: "static",
                buttons: [
                    { name: __('global:button_cancel'), callback: () => { if (button) button.disabled = false; Layout.hideDialog() } },
                    {
                        name: __('inventory:button_install'), type: 'btn-primary', callback: async (modal, footer, clickedButton) => {
                            await this.#startInstall(button, app, modal, footer, clickedButton);
                            return false;
                        }
                    }
                ]
            });
        }


        #setInstallStatus(modal, id, status){

            var li = null, icon = null;

            try {
            
                // check for the li-element (if given)
                li = modal.querySelector(`li.step_${id}`)
                if (!li) return;
                icon = li.querySelector("i");
                if (!icon) return;

            } catch(e) {
                consola.warn(e)
            }

            if(li === null && status === 'error') {
                li = modal.querySelector(`li.step__generic_error`)
                li.textContent = id;

                let icon = modal.querySelector("i.ti.rotating-icon.ti-circle-dashed")
                if(icon) {
                    icon.classList.remove("rotating-icon");
                    icon.classList.add("ti-x");
                    icon.style.color = "var(--bs-danger)";
                }

                return;
            }

            if (status === "start") {
                consola.start(id);  
                icon.classList.add("rotating-icon");
                icon.classList.remove("ti-circle");
                icon.classList.add("ti-circle-dashed");
                icon.style.color = "var(--bs-primary)";
            } else if (status === "success") {
                consola.success(id);  
                icon.classList.remove("rotating-icon");
                icon.classList.remove("ti-circle");
                icon.classList.remove("ti-circle-dashed");
                icon.classList.add("ti-check");
                icon.style.color = "var(--bs-success)";
            } else if (status === "error"){
                consola.error(id);
                icon.classList.remove("rotating-icon");
                icon.classList.remove("ti-circle-dashed");
                icon.classList.add("ti-x");
                icon.style.color = "var(--bs-danger)";
            }


        }


        // Install app
        async #startInstall(button, app, modal, footer, clickedButton) {

            if (button && app.multi_instance !== true) button.classList.add("d-none");


            var hasFrontendPostInstall = (typeof app.post_install_route === 'string') ? true: false;
            // Show postinstall
            if (hasFrontendPostInstall) {
                let post_install_node = modal.querySelector('.post_install');
                if (post_install_node) {
                    consola.debug('found post_install_node', post_install_node)
                    post_install_node.classList.remove('d-none');
                    post_install_node.style.display = 'block !important';
                } else {
                    consola.warn('cannot find post_install_node')
                }                
            }


            [].forEach.call(footer.querySelectorAll('.btn'), function (btn) { btn.disabled = true });
          

            // There may be a form with data
            const form = modal.querySelector('form');
            var formDataObj = null;
            if (form) {
                formDataObj = Object.fromEntries(new FormData(form));
            }

            var { result: data } = (formDataObj === null) ?
                // Without data  
                await w.API.post(`/api/instances/create/${app.id}`) :
                // With form data
                await w.API.post(`/api/instances/create/${app.id}`, { options: formDataObj });

            w.InstallationQueue.startListening();

            var steps = data.context.installSteps;
            // Important! The app.id is the app_blueprint.id!
            // We need the id of the app instance for a potential second part 
            // after a ui run!
            var appId = data.context.appId;

            // 1) Show the steps of the installer
            let template = [];
            let hasIFrame = false;
            for (var x in steps) {
                template.push(html`<li class="step_${steps[x].id}"><i class="ti ti-circle"></i> ${__(`installer:step_${steps[x].id}`)}</li>`)
                if(steps[x].id === 'frontendPostInstall') hasIFrame = true
            }

            render(html`${template.length > 0 ? html`<p>${unsafeHTML(__("installer:explanation", {app: app.name}))}</p>`:``}
                <style>
                    section.post_install, iframe[src=""] { display: none}
                ul[data-hasframe="1"] ~ section.post_install { display: block}</style>
                <ul data-hasframe="${hasIFrame === true?1:0}">
                    <li class="step__generic_error hide-when-empty alert alert-danger text-danger fs-2"></li>
                    ${template}
                </ul>
                <section class="post_install">
                    <iframe class="" src="" width="400" height="200" title="Post Install Iframe"></iframe>
                </section>
                `, modal);

            
            if (button) button.disabled = false;

            var activePostInstall = null;

            w.controller = new AbortController();
            w.API.poll(
                `/api/queue/${data.jobId}`,
                data => {

                    (data.steps||[]).forEach( step => {
                        // Update UI
                        this.#setInstallStatus(modal, step.id, step.status);
                        // Process post install
                        if(step.id === 'frontendPostInstall'){

                            if(activePostInstall === null && step.status !== null) {
                                activePostInstall = step.status;                                
                                this.#runFrontendPostinstall(appId, modal, footer, step.status); 
                            }
                        }
                    })

                    if(['success', 'error'].includes(data.status)) {
                        controller.abort();

                        // When steps show no error, use 
                        if(data.status === 'error') this.#setInstallStatus(modal, data.error || __('global:error_occured'), 'error');

                        Layout.setModalButtons([{name: __("global:button_close")}]); 
                    }

                },
                error => {
                    consola.error('Polling error:', error);
                    controller.abort();
                    Layout.setModalButtons([{name: __("global:button_close")}]); 
                },
                controller.signal
            );

                    
        }




        async #clickOnPostinstall(event, app, withoutUiPart) {

            if (!Layout.isAdmin) return false;
            event.stopImmediatePropagation();
            event.target.disabled = true;

            var { result: data } = await w.API.get(`/api/instances/postinstall/${app.id}/steps`);

                        
            var hasIFrame = false;
            var steps = data.installSteps;
            var stepTemplate= [];
            for (var x in steps) {

                var icon = "ti-circle";

                // has a frontendPostInstall step?
                if(steps[x].id === 'frontendPostInstall') {                    
                    if(withoutUiPart === true){
                        hasIFrame = false;
                        icon = "ti-circle-x";
                    } else {
                        hasIFrame = true;
                    }
                } 
                stepTemplate.push(html`<li class="step_${steps[x].id}"><i class="ti ${icon}"></i> ${__(`installer:step_${steps[x].id}`)}</li>`)   
            }

            // if withoutUiPart
            if(withoutUiPart === true){
                hasIFrame = false;                
            }

    
            var template = html`<section class="post_install">
                        
                        <p class="d-none">${unsafeHTML(__('installation:post_install'))}</p>
                        <ul>
                            ${stepTemplate}
                        </ul>
                        ${(hasIFrame)? html`<iframe src="" width="400" height="200" title="Post Install Iframe"></iframe>`:''}
                    </section>`;

            var modal = Layout.dialog({
                title: __('apps:install.headline'),
                body: html`<style>.modal-body:has(section.own_scrolling){overflow:hidden}</style><section class="own_scrolling d-flex flex-column gap-3" style="max-height: 450px;overflow:hidden">${template}</section>`,
                backdrop: "static",
                buttons: [
                    { name: __('global:button_cancel'), callback: () => { Layout.hideDialog() } },
                ]
            });

            let modalBody = modal._element.querySelector(".modal-body");
            let modalFooter = modal._element.querySelector(".modal-footer");       

            try{
                await this.#runFrontendPostinstall(app.id, modalBody, modalFooter, app.postInstallRoute, withoutUiPart);               
                // setTimeout(()=>{
                //     Layout.hideDialog()
                // },10000);

            }catch(e){
                consola.error("Error", e);
            }

        }

              
        async #sleep(ms){
            return new Promise((resolve)=> setTimeout(()=>{resolve()},ms));
        }

        async #sourceReachable(url){        
            try{                
                var response = await fetch(url, { credentials: "include", method: 'GET' })
                if (response.ok) {
                    return true;
                } else {
                    consola.error('Resource not available, status:', response.status);
                    return false;
                }                
            }catch(err){
                consola.error('Failed to fetch URL:', err);
                return false;
                // Handle ECONNREFUSED or network failure here before iframe load
            }
        }

        async waitUntilReachable(url, maxTries = 20, tries = 0){
            tries++;
            if(tries > maxTries) return false;
            var reachable = await this.#sourceReachable(url);
            if(reachable === true) return true;
            else {
                await this.#sleep(1000);
                return this.waitUntilReachable(url, maxTries, tries);
            } 
        }


        async #runFrontendPostinstall(appId, modal, footer, postInstallRoute, withoutUiPart) {
            

            // if postInstallRoute is set...
            if(postInstallRoute !== false && withoutUiPart !== true){
                
                this.#setInstallStatus(modal, "frontendPostInstall", "start");

                try {
                    await new Promise(async(resolve, reject)=>{

                        var frame = modal.querySelector('.post_install iframe');
                        if (!frame) reject("NO IFRAME?!")
                        window.addEventListener('message', message => {
                            let status = message.data.status;
                            consola.log("status:", status);
                            if(status === "start") consola.start("Install process");
                            else if(status === "done") {
                                var sleepMS = parseInt(message.data.sleepMS)|| 1000;
                                consola.success(`Install process (sleep: ${sleepMS})`);
                                setTimeout(()=>{
                                    return resolve("success");
                                },sleepMS);

                            }
                            else if(status === "error") return reject(message.data.error);
                        });

                        // Wait until reachable!

                        frame.classList.remove('d-none'); 
                        
                        var reachable = await this.waitUntilReachable(postInstallRoute, 60);
                        if(reachable === false) return reject("Not reachable:"+postInstallRoute);

                        frame.src = postInstallRoute;                
                        

                    });   
                }catch(e){
                    consola.error(e);
                    this.#setInstallStatus(modal, "frontendPostInstall", "error");
                    [].forEach.call(footer.querySelectorAll('.btn'), function (btn) { btn.disabled = false });
                    return false;
                }

                this.#setInstallStatus(modal, "frontendPostInstall", "success");            
            }

            try{

                await new Promise(async(resolve, reject)=>{

                    // Add new job for postinstall (job queu change!)
                    var { result: data } = await w.API.put(`/api/instances/postinstall/${appId}`);

                    w.controller = new AbortController();
                    w.API.poll(
                        `/api/queue/${data.jobId}`,
                        data => {                          

                            (data.steps||[]).forEach( step => {
                                // Update UI
                                this.#setInstallStatus(modal, step.id, step.status);                               
                            })

                            if(data.status === "error") {
                                controller.abort();
                                return reject()
                            }

                            if(data.status === 'success') {
                                controller.abort();
                                // Process is finally done.
                                // Change button to "Close"   
                                Layout.setModalButtons([{name: __("global:button_close")}]); 
                            
                                // Remove (optional) iframe
                                try {
                                    let iframe = modal.querySelector('iframe');
                                    if(iframe) iframe.remove();
                                } catch(e){}
                                resolve("success");


                            }
                        },
                        error => {                          
                            this.#setInstallStatus(modal, "postinstall", "error");
                            // Change button to "Close"   
                            Layout.setModalButtons([{name: __("global:button_close")}]);   
                            reject(e);

                        },
                        controller.signal
                    );
                });   
                
                return true;

             }catch(e){
                consola.error(e);
                this.#setInstallStatus(modal, "postinstall", "error");
                // Change button to "Close"   
                Layout.setModalButtons([{name: __("global:button_close")}]);   
                return false;
            }
        }




        async #showOptions(event, app, state) {

            if (!Layout.isAdmin) return false;

            const template = html`<p>${__('apps:options.explanation')}</p>
            <style>#application-options > div { gap: 1rem; align-items: center } #application-options > div > button { min-width: 85px } #application-options > div > label { color: var(--bs-secondary-color) !important; font-size: .8rem; }</style>
            <div id="application-options" class="d-flex flex-column gap-3">${this.#renderApplicationOptions(app, state)}</div>`

            // Show Options
            Layout.dialog({
                title: __('apps:options.headline'),
                body: template,
                buttons: [
                    { name: __('global:button_close'), callback: () => { event.target.disabled = false; Layout.hideDialog() } },

                ]
            }
            )

        }





        #pollForReloadAfterSuccess(jobId){
            w.InstallationQueue.startListening();
            
            // Poll until "success", then reload :)
            let controller = new AbortController();
            API.poll(`/api/queue/${jobId}`, 
            (data)=>{
                if(data.status === "success"){
                    controller.abort();
                    setTimeout(() => { this.#updateUI() }, 10);
                }
            }, (e)=>{
                consola.error(e);
                controller.abort();
            }, controller.signal, 1000);
        }

        

        async #start(event, id) {

            if (!Layout.isAdmin) return false;
            event.stopImmediatePropagation();
            event.target.disabled = true;
            var { result: data } = await w.API.put(`/api/instances/start/${id}`);

            this.#pollForReloadAfterSuccess(data.jobId)


        }
        async #stop(event, id) {

            if (!Layout.isAdmin) return false;

            event.target.disabled = true;

            event.stopImmediatePropagation();

            var { result: data } = await w.API.put(`/api/instances/stop/${id}`);

            this.#pollForReloadAfterSuccess(data.jobId)


        }
        async #delete(event, id, force) {

            if (!Layout.isAdmin) return false;

            event.target.disabled = true;

            event.stopImmediatePropagation();

            // Verify action
            Layout.dialog({
                title: __('apps:delete.headline'),
                body: __('apps:delete.verify'),
                buttons: [
                    { name: __('global:button_cancel'), callback: () => { event.target.disabled = false; Layout.hideDialog() } },
                    {
                        name: __('global:button_delete'), type: 'btn-danger', callback: async () => {
                            var { result: data } = await w.API.delete(`/api/instances/delete/${id}?force=${force}`);
                            this.#pollForReloadAfterSuccess(data.jobId)
                        }
                    }
                ]
            }
            )

        }



        #openApp(app) {

            if (app.hasPermission === false && !Layout.isAdmin) return false;
            var newTab = window.open(app.externalURL, '_blank');

        }



        // Function to remove classes with a specific prefix
        #removeClassPrefix(elements, prefix) {
            elements.forEach(element => {
                const classes = Array.from(element.classList);
                classes.forEach(cls => {
                    if (cls.startsWith(prefix)) {
                        element.classList.remove(cls);
                    }
                });
            });
        }


        initEventListeners() {


            // Select all radio inputs with name="contactview"
            const radioButtons = document.querySelectorAll('input[type="radio"][name="contactview"]');

            radioButtons.forEach(radio => {
                radio.addEventListener('change', (event) => {

                    let value = event.target.value;

                    const jsContacts = document.querySelector('#app_tiles');
                    const cards = jsContacts.querySelectorAll('.card');
                    const colXlElements = jsContacts.querySelectorAll('[class*="col-xl-"]');
                    const expandButtons = jsContacts.querySelectorAll('.js-expand-btn');
                    const doubleCardBodies = jsContacts.querySelectorAll('.card-body + .card-body');

                    if (value === 'grid') {
                        // Handle cards
                        this.#removeClassPrefix(cards, 'mb-');
                        cards.forEach(card => card.classList.add('mb-g'));
                        // Handle col-xl classes
                        this.#removeClassPrefix(colXlElements, 'col-xl-');
                        colXlElements.forEach(el => el.classList.add('col-xl-4'));
                        // Handle expand buttons
                        expandButtons.forEach(btn => btn.classList.add('d-none'));
                        // Handle double card bodies
                        doubleCardBodies.forEach(body => body.classList.add('show'));
                    }
                    else if (value === 'table') {
                        // Handle cards
                        this.#removeClassPrefix(cards, 'mb-');
                        cards.forEach(card => card.classList.add('mb-1'));
                        // Handle col-xl classes
                        this.#removeClassPrefix(colXlElements, 'col-xl-');
                        colXlElements.forEach(el => el.classList.add('col-xl-12'));
                        // Handle expand buttons
                        expandButtons.forEach(btn => btn.classList.remove('d-none'));
                        // Handle double card bodies
                        doubleCardBodies.forEach(body => body.classList.remove('show'));
                    }
                });
            });

            // Direct filtering implementation that doesn't rely on SmartFilter
            const filterInput = document.getElementById('js-filter-contacts');
            const clearBtn = document.getElementById('js-clear-filter');
            const counterEl = document.getElementById('filter-result-counter');

            // Input filtering
            if (filterInput === null) return;

            filterInput.addEventListener('input', (event) => {

                const filterValue = event.target.value.toLowerCase();
                const cards = document.querySelectorAll('#app_tiles .card');
                const columns = document.querySelectorAll('#app_tiles [class*="col-xl-"]');
                let visibleCount = 0;

                // First, hide all columns
                columns.forEach(col => {
                    col.style.display = 'none';
                });

                // Filter cards based on their data-filter-tags attribute
                cards.forEach(card => {
                    const filterTags = card.getAttribute('data-filter-tags') || '';
                    const parentColumn = card.closest('[class*="col-xl-"]');

                    if (filterValue === '' || filterTags.toLowerCase().includes(filterValue)) {
                        if (parentColumn) {
                            parentColumn.style.display = ''; // Show the column
                        }
                        visibleCount++;
                    }
                });

                // Update UI
                if (filterValue) {
                    counterEl.textContent = `Showing ${visibleCount} of ${cards.length} contacts`;
                    filterInput.classList.add('border-primary');
                    clearBtn.classList.remove('d-none');
                } else {
                    counterEl.textContent = '';
                    filterInput.classList.remove('border-primary');
                    clearBtn.classList.add('d-none');
                }
            });

            // Clear button functionality
            if (clearBtn) clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                filterInput.value = '';

                // Show all columns
                const columns = document.querySelectorAll('#app_tiles [class*="col-xl-"]');
                columns.forEach(col => {
                    col.style.display = '';
                });

                // Reset UI
                counterEl.textContent = '';
                filterInput.classList.remove('border-primary');
                clearBtn.classList.add('d-none');
            });

            // Set up keyboard events for convenience
            filterInput.addEventListener('keydown', (e) => {
                // Clear on Escape key
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.value = '';
                    clearBtn.click();
                }
            });
        }


        #renderTile(app) {
            var filterTags = [app.name, app.slogan || '', app.description || ''].join(" ");

            var template = html`
                <div class="col-xl-4" style="">
                    <div id="app_${app.id}" class="card border shadow-0 shadow-sm-hover mb-g" data-filter-tags="${filterTags.trim()}">
                        <div class="card-body border-faded border-top-0 border-start-0 border-end-0 rounded-top p-3">
                            <div class="d-flex flex-row align-items-center card-headline" style="gap:0.75rem">
                                
                                <span style="width:40px;color: ${app.color || 'inherit'};">
                                    ${app.img ? html`<img src="${app.img}" style="max-width: 3rem;max-height:3rem" alt="${app.name}">` : html`<span><h1 class="mb-0">${app.name.substring(0, 1)}</h1></span>`}
                                
                                    
                                </span>
                                <div class="info-card-text">
                                    <a href="javascript:void(0);" class="fs-xl text-truncate text-truncate-lg" aria-expanded="false">
                                        ${app.name}
                                        <i class="fal fa-angle-down d-inline-block ms-1 fs-md"></i>
                                    </a>                                   
                                    <span class="d-block text-truncate text-truncate-lg">${__(`app_locales:${app.tech_name + '__' + app.version}.slogan`)}</span>
                                </div>                              
                                <button type="button" class="js-expand-btn btn btn-sm btn-light waves-effect waves-themed collapsed d-none" data-bs-toggle="collapse" data-bs-target="#app_${app.id} &gt; .card-body + .card-body" aria-expanded="false">
                                    <span class="collapsed-hidden">+</span>
                                    <span class="collapsed-reveal">-</span>
                                </button>
                            </div>
                        </div>                       
                        <div class="card-body p-0 collapse show" style="">
                            <div class="p-3">
                                <p class="truncate-3 mb-4" style="min-height: 55px; line-height: 1.3em;">${__(`app_locales:${app.tech_name + '__' + app.version}.description`) || ''}</p>
                                <div class="d-flex">
                                    <button @click=${() => { this.#showDetailsDialog(app, "availableApps") }} class="btn btn-light border-0 card-link flex-fill">${__("inventory:button_details")}</button>
                                    <span class="divider flex-fill"></span>
                                    ${(Layout.isAdmin) ? html`<button @click=${(event) => { this.#create(app, event) }} class="btn btn-outline-primary waves-effect waves-themed btn-spinner flex-fill me-2">${__("inventory:button_install")}</button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            return template;

        }

        #renderInstalledTile(instance, view) {

            var state = this.#getState(instance.displayState)
            // State may change when container state differs
            if (instance.containers && Array.isArray(instance.containers)) {
                instance.containers.forEach(c => {
                    let containerState = this.#getState(instance.displayState);
                    if (state && containerState && containerState.severity > state.severity) state = containerState
                });
            }


            if (!instance.blueprint) {
                return html`<div class="col-xl-4" style="">
                    <div id="app_${instance.id}" class="card border shadow-0 shadow-sm-hover mb-g" data-filter-tags="" >
                        <div class="card-body border-faded border-top-0 border-start-0 border-end-0 rounded-top">

                        Could not find blueprint for ${instance.id}

                        </div>
                    </div>
                </div>`;
            }

            const app = instance.blueprint;

            var filterTags = [app.name, app.slogan || '', app.description || ''].join(" ");

            var template = html`
                <div class="col-xl-4" style="">
                    <div id="app_${instance.id}" class="card border shadow-0 shadow-sm-hover mb-g" data-filter-tags="${filterTags}" >
                        <div class="card-body border-faded border-top-0 border-start-0 border-end-0 rounded-top p-3">
                            <div class="d-flex flex-row align-items-center card-headline" style="gap:0.75rem">
                                
                                <span style="width:40px;color: ${app.color || 'inherit'};">
                                    ${app.img ? html`<img src="${app.img}" style="max-width: 3rem;max-height:3rem" alt="${app.name}">` : html`<span><h1 class="mb-0">${app.name.substring(0, 1)}</h1></span>`}
                                
                                    
                                </span>
                                <div class="info-card-text" @click=${() => { this.#openApp(instance); }}>
                                    <a href="javascript:void(0);" class="fs-xl text-truncate text-truncate-lg" aria-expanded="false">
                                        ${app.name}
                                        <i class="fal fa-angle-down d-inline-block ms-1 fs-md"></i>
                                        
                                    </a>   
                                    <b>${(instance.hasPermission === false) ? html`${__("inventory:no_permissions")}` : ''}</b>
                                    <span class="d-block text-truncate text-truncate-lg">${__(`app_locales:${app.tech_name + '__' + app.version}.slogan`)}</span>
                                </div>                              
                                <button type="button" class="js-expand-btn btn btn-sm btn-light waves-effect waves-themed collapsed d-none" data-bs-toggle="collapse" data-bs-target="#app_${instance.id} &gt; .card-body + .card-body" aria-expanded="false">
                                    <span class="collapsed-hidden">+</span>
                                    <span class="collapsed-reveal">-</span>
                                </button>
                            </div>
                        </div>                       
                        <div class="card-body p-0 collapse show" style="">
                            <div class="p-3 ">${this.#renderState(instance, state)}</div>
                            <div class="p-3 d-flex">                         

                                <button @click=${() => { this.#showDetailsDialog(app, "installedApps") }} title="${__("inventory:button_details")}" class="btn btn-light border-0 card-link flex-fill"><i class="ti ti-info-circle"></i> <span class="xl-only">${__("inventory:button_details")}</span></button>
                                <span style="flex-grow:20"></span>
                                ${this.#renderButtons(instance, state)}
                                
                                ${(instance.hasPermission === false && !Layout.isAdmin) ? '' : html`
                                    <button class="btn btn-sm btn-primary ms-2 mw-3" title="${__("global:button_open")}" @click=${(event) => this.#openApp(instance)}>
                                        <i style="color: white" class="ti ti-external-link"></i>
                                        <span class="${Layout.isAdmin ? 'xl-only' : ''}">${__("global:button_open")}</span>
                                    </button>`}
                                

                            </div>
                        </div>
                    </div>
                </div>`;

            return template;

        }


        #renderButtons(app, state) {

            if (!Layout.isAdmin) return '';

            var buttons = [];

            buttons.push(html`<button class="btn btn-sm btn-light me-2 mw-3" title="${__("global:button_start")}" @click=${(event) => this.#showOptions(event, app, state)}><i class="ti ti-dots-vertical"></i> <span class="xl-only">${__("global:button_options")}<span></button>`);
            return html`${buttons}`;

        }

        #renderApplicationOptions(app, state){
            
            var buttons = [];
            if (state.severity === 2) {

                if (app.external_service !== true) buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-light mw-3" title="${__("global:button_start")}" @click=${(event) => {
                    Layout.hideDialog();
                    this.#start(event, app.id)
                }}><i class="ti ti-player-play"></i> <span class="xl-only">${__("global:button_start")}<span></button> <label>${__("apps:options.button_start_label")}</label></div>`);
                buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-outline-danger mw-3" title="${__("global:button_delete")}" @click=${(event) => {
                    Layout.hideDialog();
                    this.#delete(event, app.id)
                }}><i class="ti ti-trash"></i> <span class="xl-only">${__("global:button_delete")}<span></button> <label>${__("apps:options.button_delete_label")}</label></div>`);


            } else if (state.severity < 2) {

                if (app.project === null) buttons.push(html`${__('apps:out_of_sync')}`);

                if (app.external_service !== true) buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-light mw-3" title="${__("global:button_stop")}" @click=${(event) => {
                    Layout.hideDialog();
                    this.#stop(event, app.id)
                }}><i class="ti ti-player-pause"></i> <span class="xl-only">${__("global:button_stop")}<span></button> <label>${__("apps:options.button_stop_label")}</label></div>`);
                buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-light mw-3" title="${__("apps:button_postinstall")}" @click=${async(event) => {
                    await Layout.hideDialog();
                    this.#clickOnPostinstall(event, app);
                }}><i class="ti ti-refresh"></i> <span class="xl-only">${__("apps:button_postinstall")}</span></button> <label>${__("apps:options.button_postinstall_label")}</label></div>`);
                
                // if there is a postinstallroute, we need to call it without!
                if(app.postInstallRoute !== false){
                    buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-light mw-3" title="${__("apps:button_postinstall_without_ui")}" @click=${async(event) => {
                        await Layout.hideDialog();
                        this.#clickOnPostinstall(event, app, true)
                     }}><i class="ti ti-refresh"></i> <span class="xl-only">${__("apps:button_postinstall_without_ui")}</span></button> <label>${__("apps:options.button_postinstall_without_ui_label")}</label></div>`);
                }

            } else if (state.severity === 3) {

                buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-outline-danger mw-3" title="${__("global:button_delete")}" @click=${(event) => {
                    Layout.hideDialog();
                    this.#delete(event, app.id);
                }}><i class="ti ti-trash"></i> <span class="xl-only">${__("global:button_delete")}<span></button> <label>${__("apps:options.button_delete_label")}</label></div>`);

            }


            buttons.push(html`<div class="d-flex "><button class="btn btn-sm btn-danger mw-3" title="${__("global:button_force_delete")}" @click=${(event) => {
                Layout.hideDialog();
                this.#delete(event, app.id, true)
            }}><i class="ti ti-trash"></i> <span class="xl-only">${__("global:button_force_delete")}<span></button> <label>${__("apps:options.button_force_delete_label")}</label></div>  `);



            return html`${buttons}`;
        }


        #renderState(app, state) {
            return html`<span class="badge bg-${state.color} fs-sm">${app.displayState}</span>`;
        }



        async #renderInstalledApps() {

            // Admin can install new apps
            if (!Layout.isAdmin) {
                w.Layout.renderToRef("headerActions", html``);
            } else {
                w.Layout.renderToRef("headerActions", html`<a @click=${() => { this.#tabs.activateTab("available_apps") }} type="button" class="btn btn-primary waves-effect waves-themed">${__("apps:button_add_app")}</a>`)
            }

            var data;
            try {
                data = await this.#getInstalledApps();
            } catch (e) {
                return '';
            }


            var tiles = [];
            for (var x in data) {
                let app = data[x];

                if (app.hasPermission === false && !Layout.isAdmin && this.#showAllInstalledApps === false) continue;

                tiles.push(this.#renderInstalledTile(app));
            }

            // Show empty message
            if (tiles.length === 0) {
                tiles.push(html`<div class="info-container card p-3 d-grid h-100 mb-0 border-0" style="min-height:40vh;place-items:center" role="alert">
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-ban me-2" viewBox="0 0 16 16">
                        <path d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.874ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"/>
                        </svg>
                        ${__('apps:none')}
                    </div>
                </div>`)
            }

            return html`
                <div class="main-content sortable-active">
                    <style>
                    #app_tiles > .col-xl-12 .info-card-text { flex: 1; overflow: auto }
                    #app_tiles > .col-xl-12 .info-card-text > span { max-width: none; }
                    #app_tiles > .col-xl-4 .info-card-text { display: flex; flex-direction: column; width: calc(100% - 52px); }
                    #app_tiles > .col-xl-4 .info-card-text > * { max-width: unset; }
                    div.inventory button#js-clear-filter svg { --sa-icon-size: 12px;stroke: var(--danger-500); }
                    div.inventory button#js-clear-filter:hover  svg { stroke: white; }
                    #app_tiles.installed-apps > .col-xl-4 .xl-only {display:none}
                    #application-filter { border-bottom: 1px solid var(--bs-gray-200)}
                    #js-clear-filter { border-radius: 50%}
                    </style>
                        <div class="row">
                            <div class="col-xl-12">
                                <div class="border-faded bg-faded pb-3 mb-3 d-flex align-items-center gap-3" id="application-filter">
                                    <div class="position-relative flex-grow-1">
                                        <input type="text" id="js-filter-contacts" name="filter-contacts" class="form-control shadow-inset-2" placeholder="${__("inventory:app_filter")}">
                                        <button id="js-clear-filter" type="button" class="btn btn-sm btn-outline-danger position-absolute top-50 end-0 translate-middle-y me-2 waves-effect waves-themed d-none">
                                            <i class="ti ti-x"></i>
                                        </button>
                                    </div>
                                    <div class="btn-group btn-group-lg hidden-lg-down ms-3" role="group" aria-label="Change list &amp; grid view">
                                        <input type="radio" class="btn-check" name="contactview" id="grid" value="grid" checked="checked">
                                        <label class="btn btn-outline-secondary waves-effect waves-themed p-1" for="grid" style="--bs-btn-active-bg: var(--bs-gray-100); --bs-btn-color: var(--bs-gray-500); --bs-btn-border-color: var(--bs-gray-500); --bs-btn-active-color: var(--bs-gray-500); --bs-btn-active-border-color: var(--bs-gray-500)">
                                            <i class="ti ti-layout-grid"></i>
                                        </label>
                                        <input type="radio" class="btn-check" name="contactview" id="table" value="table">
                                        <label class="btn btn-outline-secondary waves-effect waves-themed p-1" for="table" style="--bs-btn-active-bg: var(--bs-gray-100);--bs-btn-color: var(--bs-gray-500); --bs-btn-border-color: var(--bs-gray-500); --bs-btn-active-color: var(--bs-gray-500); --bs-btn-active-border-color: var(--bs-gray-500)">
                                            <i class="ti ti-list"></i>
                                        </label>
                                       
                                    </div>
                                    <span class="d-none d-sm-block" style="padding-left:10px;width:300px;vertical-align:middle;">
                                        <div style="width: 2rem;text-align_left;" class="form-check form-switch">
                                           
                                            <input type="checkbox" 
                                                    .checked=${this.#showAllInstalledApps} @change=${() => { this.#toggleInstalledApps(); }} 
                                                class="form-check-input" id="checkbox-showAllInstalledApps">
                                            <label class="form-check-label" style="width:200px;" for="checkbox-7">${__("inventory:show_all_installed_apps")}</label>
                                        </div>
                                      
                                    </span>
                                </div>                              
                                <div id="filter-result-counter" class="ms-auto fs-sm text-muted mb-g"></div>
                            </div>
                        </div>

                        <div class="row installed-apps" id="app_tiles">${tiles}</div>

            `;


        }

        async #renderAvailableApps() {



            w.Layout.renderToRef("headerActions", html``);

            var data = await this.#getAvailableApps();
            var tiles = [];
            for (var x in data.records) {
                let app = data.records[x];

                if (app.installed !== false && app.multi_instance === false) continue;

                tiles.push(this.#renderTile(app));
            }


            return html`
                <div class="main-content sortable-active">
                    <style>
                    #app_tiles > .col-xl-12 .info-card-text { flex: 1; overflow: auto }
                    #app_tiles > .col-xl-12 .info-card-text > span { max-width: none; }
                    #app_tiles > .col-xl-4 .info-card-text { display: flex; flex-direction: column; width: calc(100% - 52px); }
                    #app_tiles > .col-xl-4 .info-card-text > * { max-width: unset; }
                    div.inventory button#js-clear-filter svg { --sa-icon-size: 12px;stroke: var(--danger-500); }
                    div.inventory button#js-clear-filter:hover  svg { stroke: white; }
                    span.divider:has(+ .d-none) { display: none }
                    #js-clear-filter { border-radius: 50%}
                    #application-filter { border-bottom: 1px solid var(--bs-gray-200)}
                    </style>
                        <div class="row">
                            <div class="col-xl-12">
                                <div class="border-faded bg-faded pb-3 mb-3 d-flex align-items-center gap-3" id="application-filter">
                                    <div class="position-relative flex-grow-1">
                                        <input type="text" id="js-filter-contacts" name="filter-contacts" class="form-control shadow-inset-2" placeholder="${__("inventory:app_filter")}">
                                        <button id="js-clear-filter" type="button" class="btn btn-sm btn-outline-danger position-absolute top-50 end-0 translate-middle-y me-2 waves-effect waves-themed d-none">
                                            <i class="ti ti-x"></i>
                                        </button>
                                    </div>
                                    <div class="btn-group btn-group-lg hidden-lg-down ms-3" role="group" aria-label="Change list &amp; grid view">
                                        <input type="radio" class="btn-check" name="contactview" id="grid" value="grid" checked="checked">
                                        <label class="btn btn-outline-secondary waves-effect waves-themed p-1" for="grid" style="--bs-btn-active-bg: var(--bs-gray-100); --bs-btn-color: var(--bs-gray-500); --bs-btn-border-color: var(--bs-gray-500); --bs-btn-active-color: var(--bs-gray-500); --bs-btn-active-border-color: var(--bs-gray-500)">
                                            <i class="ti ti-layout-grid"></i>
                                        </label>
                                        <input type="radio" class="btn-check" name="contactview" id="table" value="table">
                                        <label class="btn btn-outline-secondary waves-effect waves-themed p-1" for="table" style="--bs-btn-active-bg: var(--bs-gray-100); --bs-btn-color: var(--bs-gray-500); --bs-btn-border-color: var(--bs-gray-500); --bs-btn-active-color: var(--bs-gray-500); --bs-btn-active-border-color: var(--bs-gray-500)">
                                            <i class="ti ti-list"></i>
                                        </label>
                                    </div>
                                </div>
                                <div id="filter-result-counter" class="ms-auto fs-sm text-muted mb-g"></div>
                            </div>
                        </div>

                        <div class="row" id="app_tiles">${tiles}</div>

            
            `;
        }





        #showDetailsDialog(app, view) {

            var template = html`
                <div class="m-lg-0">
                    <div class="d-flex flex-row align-items-center" style="border-bottom: 2px solid ${app.color || 'inherit'}; gap:.75rem">
                        <div class="card-img-top text-center p-0" style="max-width: 3rem;">
                            ${app.img ? html`<img src="${app.img}" style="max-width: 3rem;max-height:3rem" alt="${app.name}">` : html`<span><h2 class="mb-0" style="color: ${app.color || 'inherit'};">${app.name.substring(0, 1)}</h2></span>`}
                        </div>
                        <h5 class="card-title mb-0 flex-1 text-truncate">${app.name}</h5>
                    </div>
                    
                    <div class="card-body pt-3" style="flex: 0;">
                        <p class="card-text" data-content="description">${__(`app_locales:${app.tech_name + '__' + app.version}.slogan`) || ''}</p>
                    </div>

                    <div class="card-body pt-3 details-only flex-1 overflow-y-auto">
                        <p class="card-text text-muted hide-when-empty">${app.ur || ''}</p>
                        <p class="card-text">${__(`app_locales:${app.tech_name + '__' + app.version}.description`) || ''}</p>
                        ${app.ressources ? html`<p class="card-text fw-500">${__('apps:ressources.headline')}:
                            <ul>
                            ${Object.entries(app.ressources).map(e => html`<li>${e[0]}: ${e[1]}</li>`)}
                            </ul></p>` : html`<p class="card-text">${__('apps:ressources.none')}</p>`}
                        </p>
                    </div>
                    <div class="card-body d-flex gap-3" style="flex:0 0 auto">
                        ${(Layout.isAdmin && view === "availableApps") ? html`<button @click=${(event) => { this.#create(app, event) }} class="btn btn-outline-primary waves-effect waves-themed btn-spinner flex-fill">${__("inventory:button_install")}</button>` : ''}
                        <button @click=${() => { Layout.hideDialog() }} class="btn btn-light waves-effect waves-themed flex-fill">${__("global:button_close")}</button>

                    </div>
                </div> `;


            Layout.dialog({
                hideTitle: true,
                hideButtons: true,
                body: template
            })

        }

        #updateUI() {

            // When installedTab is active
            let activeTab = this.#tabs.activeTab;

            if (activeTab === 'installed_apps') {
                try {
                    document.getElementById("tab_installed_apps").click();
                } catch (e) { }
            }


        }

        render(configuration) {

            // remove events !
            try {
                //socket.on(`endpoint:*:*`, (event, data) => {
                    //setTimeout(() => { this.#updateUI() }, 10);
                //});

            } catch (e) {
                consola.error(e)
            }

            w.Layout.renderToRef("breadcrumbs", html`<ol class="breadcrumb ms-0">
                                <li class="breadcrumb-item">${w.Layout.config.appName}</li>
                                <li class="breadcrumb-item active" aria-current="page">${__("apps:moduleName")}</li>
                            </ol>`)

            w.Layout.renderToRef("header", html`${__("apps:moduleName")}<small>${__("apps:slogan")}</small>`);
            w.Layout.renderToRef("headerActions", "")


            this.#tabs = new Tabs({
                scope: this, active: "installed_apps", tabs: [
                    // {id: "collections", name: __("inventory:tab_collections"), content: this.#renderCollections, afterLeaving: ()=>{} },
                    { id: "installed_apps", name: __("inventory:tab_installed_apps"), content: this.#renderInstalledApps, afterRendered: () => { this.initEventListeners(); } },
                    { id: "available_apps", name: html`<span class="d-none d-sm-block">${__("inventory:tab_available_apps")}</span><span class="d-block d-sm-none">${__("inventory:tab_more_apps")}</span>`, content: this.#renderAvailableApps, afterRendered: () => { this.initEventListeners(); } }

                ]
            })




            w.Layout.renderToRef("main", html`
                
                ${(__exists("inventory:infoText")) ? html`<div class="info-container"><p class="mb-0">${unsafeHTML(`${__("inventory:infoText")}`)}</p></div>` : ''}
                <custom-wischmop .afterRemoved=${() => this.#leavingModule()}>></custom-wischmop>
                <div class="inventory">
                                               
                 ${this.#tabs.render()}                       

                </div>


            `);



        }


    }

    new InventarModule();



})(window)