(function (w) {

    class CertificatesModule {


        get name() { return __("certificate:moduleName") }

        constructor() {

    
            w.Layout.addRoute('/certificates', this, (match) => {
                this.render(match);
            },{adminOnly: true })

            w.Layout.addMenuItem({
                position: 15,
                name: "certificate:moduleName",
                url: "/certificates",
                saIcon: "certificate",
                adminOnly: true
            });
        }


         async #getData() {

            var { result: data } = await w.API.get("/api/certificates");

            var table = document.querySelector("#certificateTable tbody");
            if (table) {

                var certificates = [];
                for (var x in data.records) {
                    let cert = data.records[x];
                                     
                    certificates.push(html`<tr>                               
                                <td>
                                   ${cert.name}
                                </td>
                                <td>
                                   ${cert.expires}
                                </td>     
                                 <td>
                                   ${cert.domains.join(", ")}
                                </td>                                
                                ${(Layout.isAdmin) ? html`                                      
                                      <td class="text-end"><span class="d-inline-flex gap-3">                                                                                
                                        <button @click=${() => { this.#delete(cert) }} class="btn btn-sm btn-outline-danger">${__("global:button_delete")}</button>
                                        </span>
                                      </td>`: ``}

                            </tr>`);

                }

                render(html`${certificates}`, table);
            }

        }



        async #add() {

             var template = html`<style>.hide-when-empty:empty{ display:none !important}</style>
             <div class="error alert alert-danger text-danger fs-2 hide-when-empty"></div>
            <form>                
                <div class="mb-3">
                    <label class="form-label" for="file">${__("certificate:file")}</label>
                    <input type="file" id="file" name="file" accept=".pem, *" class="form-control" placeholder="${__("certificate:file")}">
                    <span class="form-text">${__("certificate:filetype_hint")}</span>
                </div>                               
            </form>`;

            Layout.dialog({
                title: __("certificate:dialog_add_certificate"),
                body: template,
                buttons: [{
                    name: __("global:button_add"), type:"btn-primary", callback: async (modal) => {

                        var form = modal.querySelector("form");
                        const formData = new FormData(form); // Collect form including file input

                        
                        
                        var { status, result: data } = await w.API.formPost("/api/certificates", formData);

                        if (status === 201) {
                            this.#getData();
                            var errorContainer = modal.querySelector(".error");
                            if (errorContainer) errorContainer.textContent = '';

                            return true;
                        }
                        else {

                            if (data && data.error) {

                                var errorContainer = modal.querySelector(".error");
                                if (errorContainer) errorContainer.textContent = data.error;
                            }

                            return false;
                        }


                    }
                }, { name: __("global:button_cancel") }]

            })



        }


        async #delete(user) {

            Layout.dialog({
                title: __("certificate:dialog_delete_certificate"),
                // with variabnles...therefore we need "unsafeHTML"
                body: unsafeHTML(`${__("certificate:dialog_delete_certificate_text", { email: user.email })}`),
                buttons: [{
                    name: __("global:button_delete"), type:"btn-danger", callback: async (modal) => {

                        var { status, headers, result: data } = await w.API.delete(`/api/certificates/${user.id}`);
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
                                <li class="breadcrumb-item active" aria-current="page">${__("certificate:moduleName")}</li>
                            </ol>`)

            w.Layout.renderToRef("header", html`${__("certificate:moduleName")}<small>${__("certificate:slogan")}</small>`);
            
            if (Layout.isAdmin) {
                w.Layout.renderToRef("headerActions", html`<button @click=${() => this.#add()} class="btn btn-primary waves-effect waves-themed">${__("certificate:button_add_certificate")}</a>`)
            } else {
                w.Layout.renderToRef("headerActions", html``);
            }
            
            w.Layout.renderToRef("main", html`
                
                                
                <div class="users">

                            <div class="row">
                                <div class="col-sm-12">
                                    <div class="card shadow-0 mb-g">
                                        
                                        <div class="card-body">
                                            <div class="table-responsive">
                                                <table id="certificateTable" class="table table-bordered table-striped table-hover mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>${__("certificate:fileName")}</th>  
                                                            <th>${__("certificate:expiry")}</th> 
                                                            <th>${__("certificate:domains")}</th> 
                                                                                                                                                                                                                                                                                                       
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

    new CertificatesModule();


})(window)