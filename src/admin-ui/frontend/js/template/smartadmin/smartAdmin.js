const initSmartAdmin =function(){



/* Initialize the navigation : smartNavigation.js */
            let nav;
            const navElement = document.querySelector('#js-primary-nav');
            if (navElement)
            {
                nav = new Navigation(navElement,
                {
                    accordion: true,
                    slideUpSpeed: 350,
                    slideDownSpeed: 470,
                    closedSign: '<i class="sa sa-chevron-down"></i>',
                    openedSign: '<i class="sa sa-chevron-up"></i>',
                    initClass: 'js-nav-built',
                    debug: false,
                    instanceId: `nav-${Date.now()}`,
                    maxDepth: 5,
                    sanitize: true,
                    animationTiming: 'easeOutExpo',
                    debounceTime: 0,
                    onError: error => console.error('Navigation error:', error)
                });
            }
            /* Waves Effect : waves.js */
            if (window.Waves)
            {
                Waves.attach('.btn:not(.js-waves-off):not(.btn-switch):not(.btn-panel):not(.btn-system):not([data-action="playsound"]), .js-waves-on', ['waves-themed']);
                Waves.init();
            }
            /* Initialize the list filter : listFilter.js */
            document.addEventListener('DOMContentLoaded', function()
            {
                /* initialize smartApp.js */
                appDOM.checkActiveStyles().debug(false);
                /* Initialize the list filter */
                if(typeof ListFilter !== "undefined"){
                    var listFilter = new ListFilter('#js-nav-menu', '#searchInput',
                    {
                        messageSelector: '.js-filter-message',
                        debounceWait: 200,
                        minLength: 2,
                        caseSensitive: false,
                        onFilter: function(filter)
                        {
                           
                        },
                        onReset: function()
                        {
                          
                        }
                    });
                }
                /* Panel Sorting : sortable.js 

                   Initialize Sortable for each column 
                   turn off sortable by adding "sortable-off" class to main-content before init 
                   this will however still load any saved state
                   remove !mobileOperator() to enable sortable on mobile */
                const columns = document.querySelectorAll('.main-content:not(.sortable-off) > .row > [class^="col-"]');
                /* Check if columns exist and Sortable is defined and mobileOperator is false */
                if (typeof mobileOperator !== "undefined" && columns.length > 0 && typeof Sortable !== 'undefined' && !mobileOperator())
                {
                    /* Initialize Sortable for each column */
                    columns.forEach(column =>
                    {
                        Sortable.create(column,
                        {
                            animation: 150,
                            ghostClass: 'panel-selected',
                            handle: '.panel-hdr > h2',
                            filter: '.panel-locked',
                            draggable: '.panel:not(.panel-locked):not(.panel-fullscreen)',
                            group: 'sapanels',
                            onEnd: function()
                            {
                                savePanelState();
                            }
                        });
                    });
                    /* Add class to app-content if sortable is active */
                    document.querySelector('.main-content').classList.add('sortable-active');
                }
                else
                {
                    document.querySelector('.main-content').classList.add('sortable-inactive');
                }
                /* Customized Scrollbar : smartSlimScroll.js */
                /* Initialize smartSlimScroll if not on mobile - In mobile we use native scrollbar for better UX */
                if (typeof mobileOperator !== "undefined" && !mobileOperator())
                {
                    /* Initialize smartSlimScroll */
                    new smartSlimScroll('.custom-scroll',
                    {
                        height: '100%',
                        size: '4px',
                        position: 'right',
                        color: '#000',
                        alwaysVisible: false,
                        railVisible: true,
                        railColor: '#222',
                        railOpacity: 0,
                        wheelStep: 10,
                        offsetX: '6px',
                        offsetY: '8px'
                    });
                }
                else
                {
                    document.getElementsByTagName('BODY')[0].classList.add('no-slimscroll');
                }
            });
            /* Initialize tooltips: bootstrap.bundle.js */
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl)
            {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            })
            /* Initialize popovers: bootstrap.bundle.js */
            var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
            var popoverList = popoverTriggerList.map(function(popoverTriggerEl)
            {
                return new bootstrap.Popover(popoverTriggerEl)
            })
            /* Set default dropdown behavior: bootstrap.bundle.js */
            bootstrap.Dropdown.Default.autoClose = 'outside';
            /* Inject additional scripts dynamically */
            // Your inline JavaScript code here
            //initializeBlank();
   

        }