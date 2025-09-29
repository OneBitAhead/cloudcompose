(function (w) {

    class StatsModule {

        get name() { return __("stats:moduleName") }

        constructor() {

                w.Layout.addRoute('/stats', this, (match) => {
                    this.render(match);
                })

                w.Layout.addMenuItem({
                    position: 10,
                    type: "title",
                    name: "global:management",                
                });

                w.Layout.addMenuItem({
                    position: 13,
                    name: "stats:moduleName",
                    url: "/stats",
                    saIcon: "chart-infographic"               
                });

        }


        #states = [
            { severity: 0, color: 'success', states: ['running', 'healthy'] },
            { severity: 1, color: 'warning', states: ['starting'] },
            { severity: 2, color: 'danger', states: ['exited'] },
            { severity: 3, color: 'info', states: ['out-of-sync'] }
        ]

        #getState(displayState) {
            return this.#states.filter(s => s.states.includes(displayState))[0]
        }


        humanizeBytes(bytes) {
            if (bytes === 0) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            const amount = (bytes / Math.pow(1024, i)).toFixed(2);
            return `${amount} ${units[i]}`;
        }

        #leavingModule() {       
            // remove events !
            try {
                socket.off(`docker:stats`);
            } catch(e){
                consola.error(e)
            }
        }

        #refreshStats(event, data) {

            this.#renderAppTile(data);
            this.#renderCpuTile(data);
            this.#renderMemoryTile(data);
            this.#renderDiskTile(data);
            this.#renderContainerTable(data.apps);

        }

        #renderContainerTable(data) {

            // Refresh container table
            var tableBody = document.querySelector("#container-table tbody");
            if(!tableBody) return;

            var template = [];
            for (var x in data) {
                let app = data[x];
                for (var y in app.containers) {

                    let c = app.containers[y];
                    var state = this.#getState(app.displayState)
                    template.push(html`<tr>
                            <td> <span class="badge bg-${state.color} fs-sm">${app.displayState}</span> </td>
                            <td>${app.app_name}</td>
                            <td>${c.Names}</td>
                            ${(c.stats) ? html`
                                <td>${c.stats.CPUPerc}</td>
                                <td>${c.stats.MemUsage}</td>
                                <td>${c.stats.MemPerc}</td>
                                <td>${c.stats.NetIO}</td>
                                <td>${c.stats.BlockIO}</td>                              
                            `: html`
                            <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>`
                        }                            
                        </tr>`)
                }
            }
            render(html`${template}`, tableBody);
        }


        #renderAppTile(data) {


            var apps = data.apps;

            var template = html`
                 <div style="min-height:180px;" class="card mb-g">
                    <div class="card-body">
                        <h6 class="text-muted mt-0">${__("stats:apps")}</h6>
                        <h2>${apps ? apps.length : 0}</h2>
                        <hr />
                    </div>
                </div>`;

            var tile = document.querySelector("#appTile");
            if (tile) render(template, tile);

        }
        
        #renderCpuTile(data) {        

            var info = data.system;
            
            var template = html`
            <div class="card mb-g">
                <div class="card-body">
                    <h6 class="text-muted mt-0">${__("stats:cpus")}</h6>
                    <h2>${info.systemInfo.NCPU}</h2>
                    <hr />

                        <div class="d-flex mt-2"> ${info.cpuPercent}% <span class="d-inline-block ms-auto">${Math.round(info.cpuPercent * (info.systemInfo.NCPU / 100) * 100) / 100} / ${info.systemInfo.NCPU}</span>
                    </div>
                    <div class="progress progress-sm mb-3">
                        <div class="progress-bar bg-steelblue-400" role="progressbar" style="width: ${info.cpuPercent}%;" aria-valuenow="${info.cpuPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="${info.cpuPercent}%" aria-labelledby="My Tasks"></div>
                    </div>                
                </div>
            </div>`


            var tile = document.querySelector("#cpuTile");
            if (tile) render(template, tile);



        }


        #renderMemoryTile(data) {

    
            var info = data.system;

            var template = html`<div class="card mb-g">
                                        <div class="card-body">
                                            <h6 class="text-muted">${__("stats:memory")}</h6>
                                            <h2>${this.humanizeBytes(info.systemInfo.MemTotal)}</h2> 

                                            <hr/>
                                             <div class="d-flex mt-2"> ${info.memory.percent}% <span class="d-inline-block ms-auto">${this.humanizeBytes(info.memory.used)} / ${this.humanizeBytes(info.memory.total)}</span>
                                                        </div>
                                            
                                              <div class="progress progress-sm mb-3">
                                                            <div class="progress-bar bg-steelblue-400" role="progressbar" style="width: ${info.memory.percent}%;" aria-valuenow="${info.memory.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${info.memory.percent}%" aria-labelledby="My Tasks"></div>
                                            </div>
                                        </div>
                                    </div>`


            var tile = document.querySelector("#memoryTile");
            if (tile) render(template, tile);



        }

        #renderDiskTile(data) {


            var info = data.system;


            var template = info ? html`
                    <div class="card mb-g">
                        <div class="card-body">
                            <h6 class="text-muted">${__("stats:disk")}</h6>
                                <h2>${this.humanizeBytes(info.disk ? info.disk.total : 0)}</h2> 
                                <hr/>

                            <div class="d-flex mt-2"> ${info.disk.percent}% <span class="d-inline-block ms-auto">${this.humanizeBytes(info.disk.used)} / ${this.humanizeBytes(info.disk.total)}</span>
                            </div>
                            <div class="progress progress-sm mb-3">
                                <div class="progress-bar bg-steelblue-400" role="progressbar" style="width: ${info.disk.percent}%;" aria-valuenow="${info.disk.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${info.disk.percent}%" aria-labelledby="My Tasks"></div>
                            </div>

                            
                        </div>
                    </div>
        ` : '-';

             var tile = document.querySelector("#diskTile");
            if (tile) render(template, tile);



        }





        async render(configuration) {


            // Listen directly to container stats (from docker-proxy via web socket by admin-ui)
            try {
                socket.on(`docker:stats`, this.#refreshStats.bind(this));
            } catch(e){
                consola.error(e)
            }


            w.Layout.renderToRef("breadcrumbs", html`<ol class="breadcrumb ms-0">
                 <li class="breadcrumb-item">${w.Layout.config.appName}</li>
                 <li class="breadcrumb-item active" aria-current="page">${__("stats:moduleName")}</li>
             </ol>`)

            w.Layout.renderToRef("header", html`<h1 class="subheader-title">${__("stats:moduleName")}<small>${__("stats:slogan")}</small></h1>`)
            w.Layout.renderToRef("headerActions", "")

            w.Layout.renderToRef("main", html``);


            w.Layout.renderToRef("main", html`
                            <custom-wischmop .afterRemoved=${() => this.#leavingModule()}>></custom-wischmop>
                            <!--<div class="info-container"> You can start building your application by using this page as a starting point. </div>-->
                           
                            <div class="row sortable-off" id="stats-tiles">
                                 <div id="appTile" class="col-md-12 col-lg-6 col-xl-3"></div>
                                <div id="cpuTile" class="col-md-12 col-lg-6 col-xl-3"></div>                                      
                                    
                                <div id="memoryTile" class="col-md-12 col-lg-6 col-xl-3"></div>
                                <div id="diskTile" class="col-md-12 col-lg-6 col-xl-3"></div>

                            </div>
                            

                             <div class="row">
                               <div class="col-sm-12">                            
                              
                                    <div class="card shadow-0 mb-g">
                                        <div class="card-header">
                                            <div class="card-title mb-0">${__("stats:running_containers")}</div>
                                        </div>
                                        <div class="card-body">
                                            
                                            <div class="table-responsive">
                                                <table id="container-table" class="table table-bordered table-striped table-hover mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>${__("global:state")}</th>
                                                            <th>${__("stats:table.app")}</th>
                                                            <th>${__("global:name")}</th>
                                                            <th>${__("stats:table.cpu")}</th>
                                                            <th>${__("stats:table.memUsage_and_limit")}</th>
                                                            <th>${__("stats:table.mem_percentage")}</th>
                                                            <th>${__("stats:table.net_io")}</th>
                                                            <th>${__("stats:table.block_io")}</th>                                                                                                                      
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);

            var {result:data} = await w.API.get("/api/instances/stats");
            this.#refreshStats(null, data);

            


        }


    }

    new StatsModule();


})(window)