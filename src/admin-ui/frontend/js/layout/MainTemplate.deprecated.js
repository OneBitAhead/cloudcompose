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


            <div class="app-wrap">
            <header class="app-header">
                <!-- Collapse icon -->
                <div class="d-flex flex-grow-1 w-100 me-auto align-items-center">
                    <!-- App logo -->
                    <div class="app-logo flex-shrink-0" >
                        <!-- <img src="/img/logo.svg" alt="logo"> -->
                        <!-- please check docs on how to update this logo different dimensions -->
                        <h4 class="mb-0 ps-6" style="margin-left: 2.85rem;"><span class="fw-300">Cloud</span>Compose</h4>
                        <!-- <svg class="custom-logo">
                            <use href="/img/app-logo.svg#custom-logo"></use>
                        </svg> -->
                        
                        <div class="logo-backdrop">
                            <img src="/img/cloudcompose/logo-128.png" width="40" height="40" />
                            <!--<div class="blobs">
                                <svg viewbox="0 0 1200 1200">
                                    <g class="blob blob-1">
                                        <path />
                                    </g>
                                    <g class="blob blob-2">
                                        <path />
                                    </g>
                                    <g class="blob blob-3">
                                        <path />
                                    </g>
                                    <g class="blob blob-4">
                                        <path />
                                    </g>
                                    <g class="blob blob-1 alt">
                                        <path />
                                    </g>
                                    <g class="blob blob-2 alt">
                                        <path />
                                    </g>
                                    <g class="blob blob-3 alt">
                                        <path />
                                    </g>
                                    <g class="blob blob-4 alt">
                                        <path />
                                    </g>
                                </svg>
                            </div>-->
                        </div>
                    </div>
                    <!-- Mobile menu -->
                    <div class="mobile-menu-icon me-2 d-flex d-sm-flex d-md-flex d-lg-none flex-shrink-0" data-action="toggle-swap" data-toggleclass="app-mobile-menu-open" aria-label="Toggle Mobile Menu">
                        <svg class="sa-icon">
                            <use href="/img/sprite.svg#menu"></use>
                        </svg>
                    </div>
                    <!-- Collapse icon -->
                    <button class="collapse-icon me-3 d-none d-lg-inline-flex d-xl-inline-flex d-xxl-inline-flex" data-action="toggle" data-class="set-nav-minified" aria-label="Toggle Navigation Size">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 8">
                            <polygon fill="#878787" points="4.5,1 3.8,0.2 0,4 3.8,7.8 4.5,7 1.5,4" />
                        </svg>
                    </button>
                    <!-- <form class="app-search" role="search" action="search.html" autocomplete="off">
                        <input type="text" class="form-control" placeholder="Search for anything">
                    </form> -->
                </div>
                <!-- Settings -->
                <!-- <button class="btn btn-system hidden-mobile" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-drawer-settings" aria-label="Open Settings">
                    <svg class="sa-icon sa-icon-2x">
                        <use href="/img/sprite.svg#settings"></use>
                    </svg>
                </button> -->
                <!-- Theme modes -->
                <!-- <button class="btn btn-system" data-action="toggle-theme" aria-label="Toggle Dark Mode" aria-pressed="false">
                    <svg class="sa-icon sa-icon-2x">
                        <use href="/img/sprite.svg#circle"></use>
                    </svg>
                </button> -->
                <!-- Sidebar -->
                <button class="btn btn-system d-block" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-app-drawer" aria-label="Open Sidebar" id="installation-queue-toggle">
                    <svg class="sa-icon sa-icon-2x">
                        <use href="/img/sprite.svg#monitor"></use>
                    </svg>
                    <svg style="position: absolute;bottom: 0;right: 0;--sa-icon-fill: var(--primary-500); stroke: var(--sa-icon-fill) !important" class="sa-icon sa-bold rotating-icon">
                        <use href="/img/sprite.svg#loader"></use>
                    </svg>
                </button>
                <!-- Notifications -->
                <!-- <button class="btn btn-system dropdown-toggle no-arrow" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Open Notifications">
                    <span class="badge badge-icon pos-top pos-end">5</span>
                    <svg class="sa-icon sa-icon-2x">
                        <use href="/img/sprite.svg#bell"></use>
                    </svg>
                </button> -->
                <!-- Notifications dropdown -->
                
                <div class="dropdown-menu dropdown-menu-animated dropdown-xl dropdown-menu-end p-0">
                    <div class="notification-header rounded-top mb-2">
                        <h4 class="m-0"> 5 New <small class="mb-0 opacity-80">User Notifications</small>
                        </h4>
                    </div>
                    <ul class="nav nav-tabs nav-tabs-clean" role="tablist">
                        <li class="nav-item d-none">
                            <a class="nav-link active" data-bs-toggle="tab" href="#tab-default" role="tab" aria-selected="true">Hidden</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link px-4 fs-md fw-500" data-bs-toggle="tab" href="#tab-messages" role="tab" aria-selected="false">Messages</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link px-4 fs-md fw-500" data-bs-toggle="tab" href="#tab-feeds" role="tab" aria-selected="false">Feeds</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link px-4 fs-md fw-500" data-bs-toggle="tab" href="#tab-events" role="tab" aria-selected="false">Events</a>
                        </li>
                    </ul>
                    <div class="tab-content tab-notification" >
                        
                    </div>
                    <div class="py-2 px-3 d-block rounded-bottom text-end border-light border-bottom-0 border-end-0 border-start-0">
                        <a href="#" class="fs-xs fw-500 ms-auto">view all notifications</a>
                    </div>
                </div>
                
                <div class="dropdown d-none" data-ref="language-drop"></div>

                <div style="white-space: nowrap" data-id="header-identity"></div>
                <!-- Profile -->
                <button type="button" data-id="profile-button" data-bs-toggle="dropdown" title="Your Profile" class="btn-system bg-transparent d-flex flex-shrink-0 align-items-center justify-content-center" aria-label="Open Profile Dropdown">
                    <img src="/img/avatar-admin.png" class="profile-image profile-image-md rounded-circle" alt="Sunny A.">
                </button>
                <!-- Profile dropdown -->
                <div class="dropdown-menu dropdown-menu-animated">
                    <div class="notification-header rounded-top mb-2">
                        <div class="d-flex flex-row align-items-center mt-1 mb-1 color-white">
                            <!--<span class="status status-success d-inline-block me-2">
                                <img data-id="header-avatar" src="/img/avatar-admin.png" class="profile-image rounded-circle" alt="__">
                            </span>-->
                            <div class="info-card-text">
                                <div data-id="header-user_fullname" class="fs-lg text-truncate text-truncate-lg"></div>
                                <span data-id="header-user_email" class="text-truncate text-truncate-md opacity-80 fs-sm"></span>
                            </div>
                        </div>
                    </div>
                    <div class="dropdown-divider m-0"></div>
                    <!-- <a href="#" class="dropdown-item" data-action="app-reset">
                        <span data-i18n="drpdwn.reset_layout">Reset Layout</span>
                    </a> -->
                    <!-- <a href="#" class="dropdown-item" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-drawer-settings">
                        <span data-i18n="drpdwn.settings">Settings</span>
                    </a> -->
                    <a href="#" class="dropdown-item d-block d-sm-block d-md-block d-lg-none" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-app-drawer">
                        <span data-i18n="drpdwn.settings">Page Extension</span>
                    </a>
                    <div class="dropdown-divider m-0"></div>
                    <a href="#" class="dropdown-item d-flex justify-content-between align-items-center py-3" data-action="app-fullscreen" aria-pressed="false">
                        <span data-i18n="drpdwn.fullscreen">Fullscreen</span>
                        <b class="text-muted fs-nano px-2 rounded font-monospace align-self-center border">F11</b>
                    </a>
                    <a href="#" class="dropdown-item d-flex justify-content-between align-items-center py-3" @click=${()=>Layout.setPwd()}>
                        <span data-i18n="drpdwn.fullscreen">Change Password</span>                        
                    </a>
                    <!-- <a href="#" class="dropdown-item d-flex justify-content-between align-items-center" data-action="app-print">
                        <span data-i18n="drpdwn.print">Print</span>
                        <span class="text-muted fs-nano px-2 rounded font-monospace align-self-center border">
                            <svg width="15" height="15">
                                <path d="M4.505 4.496h2M5.505 5.496v5M8.216 4.496l.055 5.993M10 7.5c.333.333.5.667.5 1v2M12.326 4.5v5.996M8.384 4.496c1.674 0 2.116 0 2.116 1.5s-.442 1.5-2.116 1.5M3.205 9.303c-.09.448-.277 1.21-1.241 1.203C1 10.5.5 9.513.5 8V7c0-1.57.5-2.5 1.464-2.494.964.006 1.134.598 1.24 1.342M12.553 10.5h1.953" stroke-width="1.2" stroke="currentColor" fill="none" stroke-linecap="square"></path>
                            </svg> + P </span>
                    </a> -->
                    <div class="dropdown-multilevel dropdown-multilevel-left">
                        <div class="dropdown-item d-flex justify-content-between align-items-center  py-3">
                            <span data-i18n="drpdwn.language">Language</span>
                            <i class="sa sa-chevron-right"></i>
                        </div>
                        <div class="dropdown-menu"  data-ref="language-submenu">
                            <a href="#?lang=fr" class="dropdown-item" data-action="lang" data-lang="fr">Français</a>
                            <a href="#?lang=en" class="dropdown-item selected" data-action="lang" data-lang="en">English (US)</a>
                            <a href="#?lang=es" class="dropdown-item" data-action="lang" data-lang="es">Español</a>
                            <a href="#?lang=ru" class="dropdown-item" data-action="lang" data-lang="ru">Русский язык</a>
                            <a href="#?lang=jp" class="dropdown-item" data-action="lang" data-lang="jp">日本語</a>
                            <a href="#?lang=ch" class="dropdown-item" data-action="lang" data-lang="ch">中文</a>
                        </div>
                    </div>
                    <div class="dropdown-divider m-0"></div>
                    <a class="dropdown-item py-3 fw-500 d-flex justify-content-between" onClick="Layout.logout()" href="#">
                        <span class="text-danger" data-i18n="drpdwn.page-logout">Logout</span>
                        <!-- <span class="d-block text-truncate text-truncate-sm">@sunnyahmed</span> -->
                    </a>
                </div>
            </header>
            <aside class="app-sidebar d-flex flex-column">
                <div class="app-logo flex-shrink-0" data-prefix="" >
                    <!-- <img src="/img/logo.svg" alt="logo"> -->
                    <!-- please check docs on how to update this logo different dimensions -->
                     <h4 class="mb-0 ps-6" style="margin-left: 2.85rem;"><span class="fw-300">Cloud</span>Compose</h4>
                    <!-- <svg class="custom-logo">
                        <use href="/img/app-logo.svg#custom-logo"></use>
                    </svg> -->
                    <div class="logo-backdrop">
                        <img src="/img/cloudcompose/logo-128" width="40" height="40" />
                        <!--<div class="blobs">
                            <svg viewbox="0 0 1200 1200">
                                <g class="blob blob-1">
                                    <path />
                                </g>
                                <g class="blob blob-2">
                                    <path />
                                </g>
                                <g class="blob blob-3">
                                    <path />
                                </g>
                                <g class="blob blob-4">
                                    <path />
                                </g>
                                <g class="blob blob-1 alt">
                                    <path />
                                </g>
                                <g class="blob blob-2 alt">
                                    <path />
                                </g>
                                <g class="blob blob-3 alt">
                                    <path />
                                </g>
                                <g class="blob blob-4 alt">
                                    <path />
                                </g>
                            </svg>
                        </div>-->
                    </div>
                </div>
                <!-- <form class="app-menu-filter-container px-4">
                    <input type="text" class="form-control" id="searchInput" placeholder="Filter" autocomplete="off">
                    <div class="js-filter-message nav-filter-msg badge bg-secondary btn" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Clear filter"></div>
                </form> -->
                <nav id="js-primary-nav" class="primary-nav flex-grow-1 custom-scroll">
                    <ul id="js-nav-menu" data-ref="menu" class="nav-menu">
                    </ul>                    
                </nav>
                <div class="nav-footer">                

                    <!--<svg class="sa-icon sa-thin sa-icon-success">
                        <use href="/img/sprite.svg#wifi"></use>
                    </svg> -->
                </div>
            </aside>
            <main class="app-body">
                <div class="app-content">
                    <div class="content-wrapper">
                    
                        <nav class="app-breadcrumb" data-ref="breadcrumbs" aria-label="breadcrumb">
                            <ol class="breadcrumb ms-0">
                                <li class="breadcrumb-item">SmartAdmin</li>
                                <li class="breadcrumb-item active" aria-current="page">Blank</li>
                            </ol>
                        </nav>
                        <div class="d-flex flex-row">
                            <h1 data-ref="header" class="subheader-title flex-fill"> 
                            </h1>
                            <section data-ref="headerActions"></section>
                        </div>
                        <div data-ref="main" class="main-content">
                            
                        </div>
                    </div>
                    <!-- <div class="content-wrapper-right">
                        <div class="right-content bg-faded d-flex flex-column h-100">
                            <div class="flex-grow-1 p-4 py-4 ">
                            </div>
                        </div>
                    </div> -->
                </div>
                <footer class="app-footer d-none">
                    <div class="app-footer-content flex-grow-1"> SmartAdmin &copy; 2025. All rights reserved, Gotbootstrap Inc. <a href="#top" class="ms-auto hidden-mobile" aria-label="Back to top">
                            <svg class="sa-icon sa-thick sa-icon-primary">
                                <use href="/img/sprite.svg#arrow-up"></use>
                            </svg>
                        </a>
                    </div>
                </footer>
            </main>
            <!--we use js-* extension to indicate a hook for a script reference-->
            <aside class="app-drawer js-app-drawer">
                <div class="app-drawer-header"> <span class="title">Installation Monitor</span> <button class="btn btn-system ms-auto" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-app-drawer" aria-label="Close">
                        <svg class="sa-icon sa-icon-2x">
                            <use href="/img/sprite.svg#x"></use>
                        </svg>
                    </button>
                </div>
                <div class="custom-scrollbar h-100" id="installation-queue-panel">
                    
                </div>
            </aside>
            <div class="backdrop" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-app-drawer"></div>
            <aside class="app-drawer js-drawer-settings">
                <div class="app-drawer-header"> Right Panel <button class="btn btn-system ms-auto" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-drawer-settings" aria-label="Close">
                        <svg class="sa-icon sa-icon-2x">
                            <use href="/img/sprite.svg#x"></use>
                        </svg>
                    </button>
                </div>
                <div class="custom-scrollbar h-100">
                    
                    
                </div>
            </aside>
            <div class="backdrop" data-action="toggle-swap" data-toggleclass="open" data-target="aside.js-drawer-settings"></div>
        </div>
        <div class="backdrop" data-action="toggle-swap" data-toggleclass="app-mobile-menu-open"></div>`);
         

})(window)