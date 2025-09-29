module.exports = {
        "language": "English",
        "flag": "🇬🇧",
        "global": {
            "management": "Management",
            "state": "Status",
            "name": "Name",
            "button_cancel": "Cancel",
            "button_close": "Close",
            "button_add": "Add",
            "button_edit": "Edit",
            "button_delete": "Delete",
            "button_force_delete": "Erase",
            "button_ok": "Ok",
            "button_save": "Save",
            "button_options": "Options",
            "button_download": "Download",
            "button_start": "Start",
            "button_stop": "Stop",
            "button_open": "Open",
            "button_delete": "Delete",
            "button_order": "Buy (with costs)",
            "info": "Info",
            "warning": "Warning",
            "error": "Error",
            "error_occured": "An error occured",
            "error_404": "Looks like you've taken a wrong turn. Let's get you back on track!",
            "could_not_save": "The data could not be saved."
        },
        "apps": {
            moduleName: "Applications",
            singular: 'Application',
            slogan: "List of all started applications",
            button_add_app: "Add application",
            running_apps: "Running applications",
            entrypoints: "Entry points",
            button_postinstall: "Run Post Install",
            button_postinstall_without_ui: "Complete Post Install",
            choose: 'Choose Application',
            none: 'No application is installed (or no rights)',
            ressources: {
                "headline": "Ressources",
                "none": "There are no official hardware requirements."
            },
            delete: {
                headline: 'Are you sure?',
                verify: 'The application and all data stored in it will be irrevocably removed.'
            },
            install: {
                headline: 'Install the application',
                verify: 'Are you sure you want to install the application <b class="text-nowrap">{{app}}</b>?',
                certificate_required: 'To run this application, it is <u>required</u> to install a SSL certificate.',
                payment_first: "The application becomes available for use immediately <b>after payment</b> has been received.",                
                confirmation: 'The application has been created and is now starting.'
            },
            options: {
                "headline": "Manage Application",
                "explanation": "Start common management tasks for your container",
                "button_start_label": "Start a previously stopped application",
                "button_delete_label": "Remove application with all contained data",
                "button_force_delete_label": "Force removal when nothing else works",
                "button_stop_label": "Stop a running application",
                "button_postinstall_label": "Repeat install process when it failed before",
                "button_postinstall_without_ui_label": "Repeat last parts of failed install process"
            },
            "out_of_sync": "The application is unfunctional"
        },
        'users': {
            moduleName: "Users",
            slogan: "Manage which users can interact with applications in your system.",
            listOfAllUsers: "List of all users",
            button_add_user: "Add user",
            button_reset_password: "Set password",
            email: "Email",
            first_name: "First name",
            last_name: "Last name",
            username: "Username",
            role: "Role",
            role_admin: "Administrator",
            role_user: "User",
            dialog_add_user: "Add user",
            dialog_edit_user: "Edit user",
            dialog_delete_user: "Delete user",
            dialog_delete_user_text: "Do you really want to delete user <b>{{email}}</b>?",
            dialog_set_password: "Set user password",
            dialog_initial_pwd: "Initial password",
            dialog_initial_pwd_text: "The initial password for user <b>{{email}}</b> is<br><h3>{{initialPwd}}</h3><br>The password was copied to the clipboard automatically.",
            password: "Password",
            password_repeat: "Repeat Password",
            choose: 'Choose User'
        },
        "inventory": {
            moduleName: "Inventory",
            slogan: "Add additional applications",
            // infoText: "Some <b>useful explanatory text</b> about using the inventory!",
            tab_collections: "Collections",
            tab_installed_apps: "Installed applications",
            tab_available_apps: "Available applications",
            tab_more_apps: "More",  
            app_filter: "Filter applications by name or description",
            button_install: "Install",
            button_details: "Details",
            show_all_installed_apps: "Show all installed apps",
            no_permissions: "You do not have permissions to use this app"
        },
        "invoices": {
            moduleName: "Invoices",
            slogan: "Review all invoices related to application or ressource subscriptions.",
            list: "History of invoices",
            date: "Date",
            name: "Description",
            none: "There are no invoices yet",
            billing: {
                "headline": "Billing",
                "address": {
                    "headline": "Billing Address",
                    "description": "Set the address that will be used for billing"
                }
            },
            "billing_periods": {
                '1m': 'Monthly Billing',
                '3m': 'Quarterly Billing',
                '6m': 'Semiannual Billing',
                '12m': 'Annual Billing'
            },
            number_of_users: 'for {{number_of_users}} Users',
            "per_month_and_user": "per month and user"

        },
        "stats": {
            moduleName: "Statistics",
            slogan: "Insights into your environment.",
            apps: "Applications",
            cpus: "CPUs",
            memory: "Memory",
            disk: "Disk",
            running_containers: "Running containers",
            table:{                
                app: "Application",
                cpu: "CPU",
                memUsage_and_limit: "Memory/Limit",
                mem_percentage: "Memory %",
                net_io: "Network I/O",
                block_io: "Disk I/O"               
            }
        },        
        
        'permissions': {
            moduleName: "Permissions",
            slogan: "Allow or restrict user access to installed applications.",
            user2app: "By User",
            app2user: "By Application",
            grant: 'Grant Access',
            do_grant: 'Check to grant access',
            no_auth_method: 'No login required',
            assign_user_description: 'Assign users to the application by activating the checkbox',
            assign_app_description: 'Enable applications for this user by activating the checkbox',
            exhausted: 'The number of available user licenses has already been exhausted.',
            available_licenses: '{{number}} user licenses available'
        },

        'installation': {
            headline: 'Installation Monitor',
            done: 'Done installing',
            states: {
                'waiting': 'waiting',
                'running': 'running',
                'error': 'failed',
                'success': 'success'
            },
            commands: {
                "app-stop": "Stopping application",
                "app-create": "Installing application",
                "app-create-postinstall": "Processing post install steps",
                "app-start": "Starting application",
                "app-delete": "Deleting application"
            },          
            post_install: "This application needs some post installation processing. Please keep this window open until finished.",
            dialog_reset_job_queue: "Reset Job Queue",
            dialog_reset_job_queue_text: "You can empty the queue (delete all running/waiting jobs) and start the queue. This can be helpful, if there are blocking queue items."
            

        },

        "settings": {
            "billing_address": {
                "headline": "Specify Billing Address",
                "description": "To book a paid service, you must first provide a billing address.",
                "mandatory_fields": 'Either name or additional info must be provided.',
                "save_address": 'Save',
                "fields": {
                    "name": "Name",
                    "name_placeholder": "(Company) Name",
                    "vat": "Vat ID",
                    "street": "Street",
                    "zipcode": "Postal Code",
                    "city": "City",
                    "country": "Country",
                    "additional_description": "If your address does not match the specified format, please use the field below.",
                    "additional": "Additional Info"
                }
            },
            "result": {
                "success": "The settings have been saved.",
                "error": "Saving the settings failed. Please retry."
            },
            "menu": {
                "change_password": "Change Password",
                "reset_job_queue": "Reset Job Queue",
                "language": "Language",
                "logout": "Logout",
                "about": "About"
            }
             
        },

        "certificate":{
            "moduleName": "SSL Certificates",
            "slogan": "Secure the access to your applications",
            "file": "File",
            "filetype_hint": "Choose a valid certificate file (typically with *.pem file ending).",
            "dialog_add_certificate": "Upload Certificate File",
            "dialog_delete_certificate": "Delete Certificate",
            "dialog_delete_certificate_text": "Are you sure to remove the selected certificate?",
            "button_add_certificate": "Upload Certificate",
            "fileName": "File Name",
            "expiry": "Expiry Date",
            "domains": "Covered Domains"
        },
        "installer":{
            "explanation": 'The following steps necessary for installation of <b class="text-nowrap">{{app}}</b> will now be carried out.<p>Please be patient. First time installs require time to download and extract images. Some application might take several minutes to setup healthy containers.</p>',
            "step_createDocker":"Create docker containers",
            "step_addAdminPermissions":"Add admin permissions",
            "step_upsertUsersInApp": "Synchronize users with the app",
            "step_waitForContainerRunning": "Wait for containers to be healthy",
            "step_frontendPostInstall": "Run application part of post installation process",
            "step_postinstall": "Run platform part of post installation process"
        }
    }

