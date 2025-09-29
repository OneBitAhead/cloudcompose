(function (w) {

    class PermissionsModule {


        #baseData;
        #permissions;
        #selectedUser;
        #selectedApp;
        #checkLicenses;

        get name() { return __("permissions:moduleName") }

        constructor() {

            this.#checkLicenses = false;

            w.Layout.addRoute('/permissions', this, (match) => {
                this.render(match);
            }, {adminOnly: true })

            w.Layout.addMenuItem({
                position: 3,
                name: "permissions:moduleName",
                url: "/permissions",
                saIcon: "lock",
                adminOnly: true
            });
            
        }

        #renderUser2AppTableBody(){
            return html`${(this.#baseData.apps||[]).map( a => { 

                let app_roles = a.app_blueprint.roles || [];
                const hasNoPermission = this.#permissions.filter( p => p.app === a.id && p.user === this.#selectedUser ).length === 0;
                
                return html`<tr>
                <td>

                ${app_roles.length > 0 ? 
                    html`<div class="d-inline-flex flex-row gap-3 align-items-center">
                        ${[].concat(app_roles).map( (r, i) => {
                            return html`<div class="form-check">
                                <input type="radio" class="form-check-input" data-app="${a.id}" data-user="${this.#selectedUser}" data-role="${r}" id="role-${r}" name="RoleRadios${this.#selectedUser}" .checked="${a.auth_method === "none" || this.#permissions.filter( p => p.app === a.id && p.user === this.#selectedUser && p.role === r ).length !== 0 || (i === 0 && this.#permissions.filter( p => p.app === a.id && p.user === this.#selectedUser && p.role === null ).length !== 0)}">
                                <label class="form-check-label" for="role-${r}" style="text-transform: capitalize">${r}</label>
                            </div>`
                        })}
                        <div class="form-check">
                            <input type="radio" class="form-check-input" id="role-null" name="RoleRadios${this.#selectedUser}" data-app="${a.id}" data-role="" data-user="${this.#selectedUser}" .checked="${hasNoPermission}">
                            <label class="form-check-label" for="role-null">None</label>
                        </div>
                    </div>` : 
                    html`<div style="width: 2rem;margin:auto" class="form-check form-switch">
                        <input type="checkbox" class="form-check-input" data-app="${a.id}" data-user="${this.#selectedUser}" id="checkbox-${a.id}" .title="${a.auth_method === "none" ? __('permissions:no_auth_method') : __('permissions:do_grant')}" .disabled="${a.auth_method === "none"}" .checked="${a.auth_method === "none" || this.#permissions.filter( p => p.app === a.id && p.user === this.#selectedUser ).length !== 0}">
                        <label class="form-check-label text-muted" style="white-space: nowrap;" for="checkbox-${a.id}"><em>${a.auth_method === "none" ? "(" + __('permissions:no_auth_method') + ")" : ""}</em></label>
                    </div>`}


                    
                </td>
                <th class="optional">${a.id}</th>
                <td>${a.app_name}</td>
                </tr>`
            })}`
        }


        async #renderUser2App() {

            await this.#getData();

            return html`

            <style>
                #applications-table td:first-child,
                #applications-table th:first-child {
                    /*max-width: 150px;
                    width: 150px;*/
                    text-align: center
                }

                #applications-table .optional {
                    display: none;
                }

            </style>
            
            <section class="mt-4">
            <div>
                <label class="form-label">${__('users:choose')}</label>
                <select class="form-select" @change="${this.#onChangeSelectedUser.bind(this)}">
                ${(this.#baseData.users||[]).map( (u,i) => html`<option ?selected="${(this.#selectedUser === null && i===0) || (this.#selectedUser === u.id)}" value="${u.id}">${u.email}</option>`)}
                </select>
            </div>
            </section>
            <section class="mt-4">
            <div>
                <label class="form-label">${__('permissions:assign_app_description')}</label>
                <table id="applications-table" class="table table-bordered table-striped table-hover mb-0">
                 <thead>
                    <tr>
                        <th>${__('permissions:grant')}</th>
                        <th class="optional">ID</th>
                        <th>${__('apps:singular')}</th>
                    </tr>
                <tbody id="applications-table-body" @input="${this.#onPermissionChange.bind(this)}">
                    ${this.#renderUser2AppTableBody()}
                </tbody>
                </table>
            </div>
            </section>`

        }

        // Handler to update UI when user changes
        async #onChangeSelectedUser(e){

            let user = e.target.value;
            this.#selectedUser = parseInt(user, 10);

            // Renew Permissions
            var { result: data } = await w.API.get(`/api/permissions`);  
            this.#permissions = data;

            render("", document.getElementById('applications-table-body'))
            render( this.#renderUser2AppTableBody() , document.getElementById('applications-table-body'))

        }

        // Handler to update UI when app changes
        async #onChangeSelectedApp(e){

            let app = e.target.value;
            this.#selectedApp = parseInt(app, 10);

            // Renew Permissions
            var { result: data } = await w.API.get(`/api/permissions`);  
            this.#permissions = data;

            render("", document.getElementById('users-table-body'))
            render( this.#renderApp2UserTableBody() , document.getElementById('users-table-body'))

        }

        // Handler to sync role assignments to API
        async #onPermissionChange(e){
            
            const appId = parseInt(e.target.dataset.app, 10);
            const userId = parseInt(e.target.dataset.user, 10);
            const role = e.target.dataset.hasOwnProperty('role') ? e.target.dataset.role : null;
            const payload = {user: userId, app: appId, role: role};

            const action = ((role === null && !e.target.checked) || role === '') ? 'delete' : 'post';

            // Check available licenses
            if(action === "post" && this.#checkLicenses === true){

                let appPermissions = structuredClone(this.#permissions).filter( p => p.app === appId);
                let app = this.#baseData.apps.filter( a => a.id === appId);

                if(app.length === 1 && app[0].available_users <= appPermissions.length){
                     Layout.toast(__("global:warning"), __('permissions:exhausted'), 'warning');
                     e.target.checked = false;
                    return;
                }
                
            }

            // Send change to API: 
            // When checkbox is checked, the permission has to be set, else deleted
            var {status, headers, result} = await w.API[ action ](`/api/permissions`, payload);
            if(!result || status > 200){
               Layout.toast(__("global:error"), (result.error && result.error.message) ? result.error.message: __('global:could_not_save'), 'danger')
               // reload to return to the "before" state!
               this.render();
            } else {

                // Update internal storage
                if(action === 'post') { this.#permissions.push(payload)}
                if(action === 'delete') { 
                    let index = this.#permissions.findIndex( p => p.app === payload.app && p.user == payload.user && p.role === payload.role); 
                    if(index !== -1) this.#permissions.splice(index, 1)
                }
            }

        }


        async #renderApp2User() {

            await this.#getData();

            return html`

            <style>
                #users-table td:first-child,
                #users-table th:first-child {
                    /*max-width: 150px;
                    width: 150px;*/
                    text-align: center
                }
                #users-table .optional {
                    display: none;
                }
            </style>
            
            <section class="mt-4">
            <div>
                <label class="form-label">${__('apps:choose')}</label>
                <select class="form-select" @change="${this.#onChangeSelectedApp.bind(this)}">
                ${(this.#baseData.apps||[]).map( (a, i) => {

                    const postfix = (this.#checkLicenses === true) ? '- '+__(`permissions:available_licenses`, {number: a.available_users}) : '';

                    return html`<option ?selected="${(this.#selectedApp === null && i===0) || (this.#selectedApp === a.id)}" value="${a.id}">${a.app_name} ${postfix}</option>`
                })}
                </select>
            </div>
            </section>
            <section class="mt-4">
            <div>
                <label class="form-label">${__('permissions:assign_user_description')}</label>
                <table id="users-table" class="table table-bordered table-striped table-hover mb-0">
                 <thead>
                    <tr>
                        <th class="shrink-column"><span>${__('permissions:grant')}</span></th>
                        <th class="optional">ID</th>
                        <th class="d-none d-sm-block">${__('users:email')}</th>
                        <th>${__('users:username')}</th>
                    </tr>
                <tbody id="users-table-body" @input="${this.#onPermissionChange.bind(this)}">
                    ${this.#renderApp2UserTableBody()}
                </tbody>
                </table>
            </div>
            </section>`

        }

        #renderApp2UserTableBody(){

            const app = (this.#baseData.apps||[]).filter( a => a.id === this.#selectedApp)[0];
            let app_roles = app ? app.app_blueprint.roles : [];
            

            return html`${(this.#baseData.users||[]).map( u => { 
                
                const hasNoPermission = this.#permissions.filter( p => p.app === this.#selectedApp && p.user === u.id ).length === 0;

                return html`<tr>
                <td scope="row" class="shrink-column">
                    ${app_roles ? html`<div class="d-inline-flex flex-row gap-3 align-items-center">
                        ${[].concat(app_roles).map( (r, i) => {
                            return html`<div class="form-check">
                                <input type="radio" class="form-check-input" data-app="${this.#selectedApp}" data-user="${u.id}" data-role="${r}" id="role-${r}" name="RoleRadios${u.id}" .checked="${app.auth_method === "none" || this.#permissions.filter( p => p.app === this.#selectedApp && p.user === u.id && p.role === r ).length !== 0 || (i === 0 && this.#permissions.filter( p => p.app === this.#selectedApp && p.user === u.id && p.role === null ).length !== 0)}">
                                <label class="form-check-label" for="role-${r}" style="text-transform: capitalize">${r}</label>
                            </div>`
                        })}
                        <div class="form-check">
                            <input type="radio" class="form-check-input" id="role-null" name="RoleRadios${u.id}" data-app="${this.#selectedApp}" data-role="" data-user="${u.id}" .checked="${hasNoPermission}">
                            <label class="form-check-label" for="role-null">None</label>
                        </div>
                    </div>` : html`
                    <div style="width: 2rem;margin:auto" class="form-check form-switch">
                        <input type="checkbox" class="form-check-input" data-app="${this.#selectedApp}" data-user="${u.id}" id="user-checkbox-${u.id}" .title="${app.auth_method === "none" ? __('permissions:no_auth_method') : __('permissions:do_grant')}" .disabled="${app.auth_method === "none"}" .checked="${app.auth_method === "none" || this.#permissions.filter( p => p.app === this.#selectedApp && p.user === u.id ).length !== 0}">
                        <label class="form-check-label" for="user-checkbox-${u.id}"></label>
                    </div>`}
                    
                </td>
                <td class="optional">${u.id}</td>
                <td class="d-none d-sm-block">${u.email}</td>
                <td>${u.username||''}</td>
                </tr>`})}`
        }

        async #getData(){
            try {

                var { result: data } = await w.API.get(`/api/permissionBase`); 
                if(data && data.error) {throw new Error(data.error)}
                

                for(var x in data.apps){
                    let app = data.apps[x];
                    let available_users = (app.orders||[])
                        .filter( o => o.cancellation_date === null || (new Date(o.cancellation_date)) > (new Date()))
                        .reduce( (accumulator, order) => { return accumulator + order.product.number_of_users }, 0);

                    app.available_users = available_users
                }

                this.#baseData = data;

            } catch(e){
                Layout.toast(__('global:error'), e, 'danger');
                Layout.showErrorTemplate(404, `You are not allowed to manage permissions.`)
                return false
            }


            // Permissions
            var { result: data } = await w.API.get(`/api/permissions`);  
            this.#permissions = data;

            return true;
        }


        async render(configuration) {


            // Base data: users and apps (and their relation)
            const result = await this.#getData();
            if(result !== true) return;         

            
                
            w.Layout.renderToRef("breadcrumbs", html`<ol class="breadcrumb ms-0">
                                <li class="breadcrumb-item">${w.Layout.config.appName}</li>
                                <li class="breadcrumb-item active" aria-current="page">${__("permissions:moduleName")}</li>
                            </ol>`)

            w.Layout.renderToRef("header", html`${__("permissions:moduleName")}<small>${__('permissions:slogan')}</small>`);
            w.Layout.renderToRef("headerActions", "")

            if(this.#baseData && this.#baseData.users) { this.#selectedUser = (this.#baseData.users)[0].id; }
            

            if(this.#baseData.apps && this.#baseData.apps.length === 0){
                w.Layout.renderToRef("main", html`<div class="info-container card p-3 d-grid h-100" style="min-height:50vh;place-items:center" role="alert">
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-ban me-2" viewBox="0 0 16 16">
                        <path d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.874ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"/>
                        </svg>
                        ${__('apps:none')}
                    </div>
                </div>`);
                return;
            } 
            if(this.#baseData && this.#baseData.apps) { this.#selectedApp = (this.#baseData.apps||[])[0].id; }


            var tabs = new Tabs({
                scope: this, active: "users", tabs: [
                    { id: "users", name: __("permissions:user2app"), content: this.#renderUser2App, afterLeaving: () => { } },
                    { id: "apps", name: __("permissions:app2user"), content: this.#renderApp2User },
                ]
            })

            w.Layout.renderToRef("main", html`
                
                ${(__exists("permissions:infoText")) ? html`<div class="info-container"><p class="mb-0">${unsafeHTML(`${__("permissions:infoText")}`)}</p></div>` : ''}

                <div class="permissions">      
                    ${tabs.render()}
                </div>

            `);

        }


    }

    new PermissionsModule();

})(window)

