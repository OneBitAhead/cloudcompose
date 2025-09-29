(function (w) {

    class UsersModule {


        get name() { return __("users:moduleName") }

        constructor() {

            w.Layout.addRoute('/users', this, (match) => {
                this.render(match);
            }, { adminOnly: true })

            w.Layout.addMenuItem({
                position: 2,
                name: "users:moduleName",
                url: "/users",
                saIcon: "users",
                adminOnly: true
            });

        }



        async #getData() {

            var { result: data } = await w.API.get("/api/users");

            var table = document.querySelector("#usersTable tbody");
            if (table) {

                var users = [];
                for (var x in data.records) {
                    let user = data.records[x];

                    users.push(html`<tr>                               
                                <td scope="row">
                                   ${user.username}
                                </td>
                                <td>
                                   ${user.email}
                                </td>                                
                                ${(Layout.isAdmin) ? html`
                                      <td>${ ['admin', 'user'].includes(user.role) ? __(`users:role_${user.role}`) : ''}</td>
                                      <td class="text-end"><span class="d-inline-flex gap-3">
                                        <button @click=${() => { this.#edit(user) }} class="btn btn-sm btn-light">${__("global:button_edit")}</button>
                                        <button @click=${() => { Layout.setPwd(user.id) }} class="btn btn-sm btn-light">${__("users:button_reset_password")}</button>
                                        <button @click=${() => { this.#delete(user) }} class="btn btn-sm btn-outline-danger">${__("global:button_delete")}</button>
                                        </span>
                                      </td>`: ``}

                            </tr>`);

                }

                render(html`${users}`, table);
            }

        }


        #handleEmailInput(e) {

            var email = e.target.value;
            // Extract the part before '@' and update username
            const split = email.split('@');
            let username = split[0];

            var nameField = document.querySelector("#layoutModal").querySelector("#username");
            if (nameField) nameField.value = username;
        }


        getUserTemplate(data) {

            var user = structuredClone(data || {})

            return html`
            <form>                
                <div class="mb-3">
                    <label class="form-label" for="email">${__("users:email")}</label>
                    <input type="email" id="email" name="email" @input=${this.#handleEmailInput} .disabled=${(user.email)} .value=${user.email || ''} class="form-control" placeholder="${__("users:email")}">
                </div>                
                <div class="mb-3">
                    <label class="form-label" for="username">${__("users:username")}</label>
                    <input type="text" id="username" .disabled=${(user.username)} .value=${user.username || ''} class="form-control" placeholder="${__("users:username")}">
                </div>                           
                <div class="mb-3">
                    <label class="form-label" for="role">${__("users:role")}</label>
                    <select class="form-select" id="role">                        
                        <option .selected=${(user.role === "user")} value="user">${__("users:role_user")}</option>                        
                        <option .selected=${(user.role === "admin")} value="admin">${__("users:role_admin")}</option>
                    </select>
                </div>   

            </form>`;

        }

        



        async #add() {

            var template = this.getUserTemplate();

            Layout.dialog({
                title: __("users:dialog_add_user"),
                body: template,
                buttons: [{
                    name: __("global:button_add"), callback: async (modal) => {

                        var form = modal.querySelector("form");

                        var email = form.querySelector("#email").value;
                        var username = form.querySelector("#username").value;
                        var role = form.querySelector("#role").value;


                        var { status, result: data } = await w.API.post("/api/users", {
                            email: email,
                            username: username,
                            role: role
                        });
                        if (status === 201) {
                            this.#getData();

                            var errorContainer = modal.querySelector(".error");
                            if (errorContainer) errorContainer.remove();

                            // Show the initial password
                            setTimeout(()=>{
                                Layout.dialog({
                                    title: __("users:dialog_initial_pwd"),
                                    body: unsafeHTML(`${__("users:dialog_initial_pwd_text",{email: email, initialPwd: data.initialPwd})}`)
                                });
                                                
                                navigator.clipboard.writeText(data.initialPwd).then(() => {
                                    consola.debug(`Password copied to clipboard: '${data.initialPwd}'`);
                                });


                            },1);

                            return true;
                        }
                        else {

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


        async #edit(user) {

            var template = this.getUserTemplate(user);

            Layout.dialog({
                title: __("users:dialog_edit_user"),
                body: template,
                buttons: [{
                    name: __("global:button_save"), callback: async (modal) => {

                        var form = modal.querySelector("form");
                        var username = form.querySelector("#username").value;
                        var role = form.querySelector("#role").value;

                        var { status, result: data } = await w.API.put("/api/users/" + user.id, {
                            username: username,
                            role: role
                        });


                        if (status === 200) {
                            this.#getData();

                            var errorContainer = modal.querySelector(".error");
                            if (errorContainer) errorContainer.remove();

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

        async #delete(user) {

            Layout.dialog({
                title: __("users:dialog_delete_user"),
                // with variabnles...therefore we need "unsafeHTML"
                body: unsafeHTML(`${__("users:dialog_delete_user_text", { email: user.email })}`),
                buttons: [{
                    name: __("global:button_delete"), type:"btn-danger", callback: async (modal) => {

                        var { status, headers, result: data } = await w.API.delete(`/api/users/${user.id}`);
                        if (status === 200) {
                            this.#getData();
                            return true;
                        } else {
                            Layout.renderToRef("modal-body", html`${data.error}`);
                            return false;
                        }

                    }
                }, { name: __("global:button_cancel") }]
            })


        }


        render(configuration) {

            w.Layout.renderToRef("breadcrumbs", html`<ol class="breadcrumb ms-0">
                                <li class="breadcrumb-item">${w.Layout.config.appName}</li>
                                <li class="breadcrumb-item active" aria-current="page">${__("users:moduleName")}</li>
                            </ol>`)

            w.Layout.renderToRef("header", html`${__("users:moduleName")}<small>${__("users:slogan")}</small>`);

            if (Layout.isAdmin) {
                w.Layout.renderToRef("headerActions", html`<button @click=${() => this.#add()} class="btn btn-primary waves-effect waves-themed">${__("users:button_add_user")}</a>`)
            } else {
                w.Layout.renderToRef("headerActions", html``);
            }


            w.Layout.renderToRef("main", html`                      
                       <div class="users">

                            <div class="row">
                                <div class="col-sm-12">
                                    <div class="card shadow-0 mb-g">
                                        <div class="card-header d-none">
                                            <div class="card-title mb-0">${__("users:listOfAllUsers")}</div>
                   
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive">
                                                <table id="usersTable" class="table table-bordered table-striped table-hover mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col">${__("users:username")}</th>   
                                                            <th scope="col">${__("users:email")}</th>                                                                                                                                                                              
                                                            ${(Layout.isAdmin) ? html`<th scope="col">${__("users:role")}</th><th scope="col"></th>` : ''}
                                                        </tr>
                                                    </thead>
                                                    <tbody></tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    `);


            this.#getData();

        }


    }

    new UsersModule();

})(window)