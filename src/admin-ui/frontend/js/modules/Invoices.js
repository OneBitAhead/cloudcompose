(function(w){


    class RechnungenModule {

        #tabs;
        
        get name() { return __("invoices:moduleName") }

        constructor(){
                    
                w.Layout.addRoute('/invoices', this, (match) => {             
                    this.render(match);                
                }, {adminOnly: true }) 
                
                w.Layout.addMenuItem({
                    position: 15,
                    name: "invoices:moduleName",
                    url: "/invoices",
                    saIcon: "dollar-sign",
                    adminOnly: true
                });
        }

        #leavingModule(){
        }


        async #getData(){            
                   
            var data;

            var table = document.querySelector("#invoicesTable tbody");
            if(!table) return 

            try {
                var {result:data} = await w.API.get("/api/invoices");
            } catch(e){
                render(html`<tr><td class="text-center" colspan="${(Layout.isAdmin)?3:2}">${__('invoices:none')}</td></tr>`, table);
                return;
            }

            

            
            
            // Generate list of invoices
            var invoices = [];

            if(!data.records || data.records.length === 0) {

                invoices.push(html`<tr><td class="text-center" colspan="${(Layout.isAdmin)?3:2}">${__('invoices:none')}</td></tr>`);


            } else {

                for(var x in data.records){
                    let invoice = data.records[x]; 
                    
                    invoices.push(html`<tr>                               
                        <td style="vertical-align: middle;">
                            ${invoice.date ? new Date(invoice.date).toLocaleString() : '-'}
                        </td>
                        <td style="vertical-align: middle;">${invoice.description || ''}</td>
                        
                        ${(Layout.isAdmin)? html`
                            <td>
                                <button @click=${()=>{this.#download(invoice.id)}} class="btn btn-sm btn-light">${__("global:button_download")}</button>                                     
                            </td>`:``}

                    </tr>`);
                    
                }

            }

            render(html`${invoices}`, table);
        
        }


        async #updateBillingAddress(e){

            e.preventDefault();
            e.stopPropagation();        

            const form = e.target;
            const formElements = form.elements;

            const formDataObj = {};

            for (let element of formElements) {
                if (element.id) { 
                    formDataObj[element.id] = element.value;
                }
            }

            // Basic checking
            if( (formDataObj.name||'').trim() === '' && (formDataObj.additionalInfo||'').trim() === '' ) {
                const alert = modal.querySelector('#billing-addres-alert');
                if(alert) alert.innerText = __('settings:billing_address.mandatory_fields')
                return false;
            }

            // Sync to API
            const checkAddress =  await w.API.post(`/api/settings/`, {key: 'billing_address', value: formDataObj});

            Layout.toast('', checkAddress.status < 400 ? __('settings:result.success') : __('settings:result.error'), checkAddress.status < 400 ? 'success' : 'warning', 3000)     
            
        }

        #download(invoice){}

        render( match ){

            w.Layout.renderToRef("headerActions", html``)

            w.Layout.renderToRef("header",html`<h1 class="subheader-title"> ${__("invoices:moduleName")}<small> ${__('invoices:slogan')}</small>
                            </h1>`)
            w.Layout.renderToRef("breadcrumbs",html`<ol class="breadcrumb ms-0">
                                <li class="breadcrumb-item">${w.Layout.config.appName}</li>
                                <li class="breadcrumb-item active" aria-current="page">${__("invoices:moduleName")}</li>
                            </ol>`)

            
            this.#tabs = new Tabs({scope: this, active: "invoices", tabs:[
                // {id: "collections", name: __("inventory:tab_collections"), content: this.#renderCollections, afterLeaving: ()=>{} },
                {id: "invoices", name:  __("invoices:moduleName"), content: this.#renderInvoices , afterRendered: ()=>{ this.#getData(); } },
                {id: "management", name:  __("invoices:billing.headline"), content: this.#renderBillingManagement /*, afterRendered: ()=>{ this.#getOptionData(); }*/ },
            ]})


            w.Layout.renderToRef("main", html`
                
                ${(__exists("invoices:infoText"))? html`<div class="info-container"><p class="mb-0">${unsafeHTML(`${__("invoices:infoText")}`)}</p></div>`:''}

                <custom-wischmop .afterRemoved=${() => this.#leavingModule()}>></custom-wischmop>
                <div class="invoices">
                                               
                 ${this.#tabs.render()}                       

                </div>


            `);

                      
        }



        async #renderInvoices(){

            return html`
                <div class="invoices mt-3">

                    <div class="row">
                        <div class="col-sm-12">
                            <div class="card shadow-0 mb-g">
                                <div class="card-header">
                                    <div class="card-title">${__("invoices:list")}</div>
                                </div>

                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table id="invoicesTable" class="table table-bordered table-striped table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>${__("invoices:date")}</th>  
                                                    <th>${__("invoices:name")}</th>                                                                                                                    
                                                    ${(Layout.isAdmin)? html`<th></th>`:''}
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
            
            `;

        }

        async #renderBillingManagement() {

            const data =  await w.API.get(`/api/settings/billing_address`);
            var billingAddress = null;
            try {
                billingAddress = (data.status === 200 && data.result.records.length === 1) ? data.result.records[0].value : null;
            } catch(e){}

            return html`<div class="panel panel-icon mt-3" draggable="false">
                <div class="panel-hdr">
                    <h2>
                        ${__("invoices:billing.address.headline")}
                    </h2>
                </div>
                <div class="panel-container">
                    <div class="panel-content">
                        <p class=""> ${billingAddress === null ? __('settings:billing_address.description') :  __('invoices:billing.address.description') }</p>

                        <form style="max-width: 800px" class="small-placeholder" @submit=${(event)=>{ this.#updateBillingAddress(event) }}>
                                
                            <div class="row mb-3 align-items-center">
                                <label for="company" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.name')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="name" required value="${billingAddress?billingAddress.name||'':''}" placeholder="${__('settings:billing_address.fields.name_placeholder')}">
                                </div>
                            </div>

                            <div class="row mb-3 align-items-center">
                                <label for="company" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.vat')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="vat" required value="${billingAddress?billingAddress.vat||'':''}" placeholder="${__('settings:billing_address.fields.vat')}">
                                </div>
                            </div>
                            
                            <div class="row mb-3 align-items-center">
                                <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.street')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="street" value="${billingAddress?billingAddress.street||'':''}" placeholder="${__('settings:billing_address.fields.street')}" required>
                                </div>
                            </div>
                            
                            <div class="row mb-3 align-items-center">
                                <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.zipcode')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="zipcode" value="${billingAddress?billingAddress.zipcode||'':''}" placeholder="${__('settings:billing_address.fields.zipcode')}">
                                </div>
                            </div>

                            <div class="row mb-3 align-items-center">
                                <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.city')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="city" value="${billingAddress?billingAddress.city||'':''}" placeholder="${__('settings:billing_address.fields.city')}">
                                </div>
                            </div>

                            
                            <div class="row mb-3 align-items-center">
                                <label for="email" class="col-sm-3 col-form-label text-end">${__('settings:billing_address.fields.country')}</label>
                                <div class="col-sm-9">
                                <input type="text" class="form-control" id="country" value="${billingAddress?billingAddress.country||'':''}" placeholder="${__('settings:billing_address.fields.country')}">
                                </div>
                            </div>

                            <div class="row mb-2 align-items-center">
                            <small class="text-muted px-3 mt-2">${__('settings:billing_address.fields.additional_description')} </small>
                            </div>

                            <div class="row mb-3 align-items-center">
                                <label for="additionalInfo" class="col-sm-3 col-form-label text-end text-nowrap">${__('settings:billing_address.fields.additional')}</label>
                                <div class="col-sm-9">
                                <textarea class="form-control" id="additionalInfo" rows="3" placeholder="${__('settings:billing_address.fields.additional')}">${billingAddress?billingAddress.additionalInfo||'':''}</textarea>
                                </div>
                            </div>

                            <div class="row mb-3 flex-row-reverse">
                                <button type="submit" style="flex:0;margin-right: calc(var(--bs-gutter-x) * .5);" class="d-inline btn btn-primary">${__('global:button_save')}</button>
                            </div>
                            
                        </form>
                    </div>
                </div>
            </div>`

        }
    }

    new RechnungenModule();

})(window)