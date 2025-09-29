(function(w){

    w.Layout.setMainTemplate(html`

    <!-- Modal -->
    <div class="modal fade" id="layoutModal" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modal" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title" data-ref="modal-title">Modal aa title</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div data-ref="modal-body" class="modal-body">
            ...
        </div>
        <div data-ref="modal-buttons" class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Save changes</button>
        </div>
        </div>
    </div>
    </div>
    <!-- end of modal -->


    <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" data-sidebar-position="fixed" data-header-position="fixed">

    <!-- Sidebar Start -->
    <aside class="left-sidebar">
      <!-- Sidebar scroll-->
      <div>
        <div class="brand-logo d-flex align-items-center justify-content-between">
          <a href="/" class="text-nowrap logo-img d-flex flex-row align-items-center ">
            <!--<img src="assets/images/logos/logo.svg" alt="" />-->
            <img src="/img/cloudcompose/logo-128.png" width="40" height="40" />
            <h4 class="mb-0 ps-2"><span class="fw-bolder">Cloud</span>Compose</h4>
          </a>
          <div class="close-btn d-xl-none d-block sidebartoggler cursor-pointer" id="sidebarCollapse">
            <i class="ti ti-x fs-6"></i>
          </div>
        </div>
        <!-- Sidebar navigation-->
        <nav class="sidebar-nav scroll-sidebar" data-simplebar="">
          <ul id="sidebarnav" data-ref="menu" >
            
          </ul>
        </nav>
        <!-- End Sidebar navigation -->
      </div>
      <!-- End Sidebar scroll-->
    </aside>
    <!--  Sidebar End -->
    <!--  Main wrapper -->
    <div class="body-wrapper">
      <!--  Header Start -->
      <header class="app-header">
        <nav class="navbar navbar-expand-lg navbar-light">
          <ul class="navbar-nav">
            <li class="nav-item d-block d-xl-none">
              <a class="nav-link sidebartoggler " id="headerCollapse" href="javascript:void(0)">
                <i class="ti ti-menu-2 i-sidebartoggler"></i>
              </a>
            </li>
            
          </ul>
          <div class="navbar-collapse justify-content-end px-0" id="navbarNav">
            <ul class="navbar-nav flex-row ms-auto align-items-center justify-content-end">
               
            <li class="nav-item dropdown">
              <a class="nav-link " href="javascript:void(0)" id="installation-queue-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="ti ti-bell"></i>
                <!-- <div class="notification bg-primary rounded-circle"></div>-->

                <svg  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"  fill="none"  
                  stroke="currentColor"  stroke-width="2"  
                  stroke-linecap="round"  stroke-linejoin="round"  
                  style="position: absolute;bottom: 0;right: 0;--sa-icon-fill: #266a88; stroke: var(--sa-icon-fill) !important; width: 100%; height: 100%;"
                  class="rotating-icon">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M7.5 4.21l0 .01" />
                    <path d="M4.21 7.5l0 .01" />
                    <path d="M3 12l0 .01" />
                    <path d="M4.21 16.5l0 .01" />
                    <path d="M7.5 19.79l0 .01" />
                    <path d="M12 21l0 .01" />
                    <path d="M16.5 19.79l0 .01" />
                    <path d="M19.79 16.5l0 .01" />
                    <path d="M21 12l0 .01" />
                    <path d="M19.79 7.5l0 .01" />
                    <path d="M16.5 4.21l0 .01" />
                    <path d="M12 3l0 .01" />
                  </svg>

              </a>
              <div class="dropdown-menu dropdown-menu-animate-up dropdown-menu-end" aria-labelledby="installation-queue-toggle">
                <div class="message-body" id="installation-queue-panel">
                  <section class="h-100 d-grid" style="place-items:center">
                
                  <div class="text-center text-success">
                    <i class="ti ti-check"></i>  
                    <span class="fs-xl p-3">${__('installation:done') || "Done"}</span>
                  </div>

                  </section>
                </div>
              </div>
            </li>


              <li data-id="userMenu" class="nav-item dropdown">         
              </li>
            </ul>
          </div>
        </nav>
      </header>
      <!--  Header End -->


      <div class="body-wrapper-inner">
        <div class="container-fluid" >


        

          <div class="row">

            <nav class="app-breadcrumb" data-ref="breadcrumbs" aria-label="breadcrumb">
                <ol class="breadcrumb ms-0">
                    <li class="breadcrumb-item">CloudCompose</li>
                    <li class="breadcrumb-item active" aria-current="page"></li>
                </ol>
            </nav>
            <div class="d-flex flex-row gap-3">
                <h1 data-ref="header" class="subheader-title flex-fill"> 
                </h1>
                <section data-ref="headerActions"></section>
            </div>
            <div data-ref="main" class="main-content">
                
            </div>

          </div>




          
        </div>
      </div>
    </div>
  </div>
  
  <div class="py-6 px-6 text-center d-none">
    <p class="mb-0 fs-4">Design and Developed by <a href="#"
        class="pe-1 text-primary text-decoration-underline">Wrappixel.com</a> Distributed by <a href="https://themewagon.com" target="_blank" >ThemeWagon</a></p>
    </div>`);
    
})(window)