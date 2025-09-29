module.exports = {
    language: "Italiano",
    flag: "🇮🇹",
    global: {
        management: "Gestione",
        state: "Stato",
        name: "Nome",
        button_cancel: "Annulla",
        button_close: "Chiudi",
        button_add: "Aggiungi",
        button_edit: "Modifica",
        button_delete: "Elimina",
        button_force_delete: "Elimina definitivamente",
        button_ok: "Ok",
        button_save: "Salva",
        button_options: "Opzioni",
        button_download: "Scarica",
        button_start: "Avvia",
        button_stop: "Ferma",
        button_open: "Apri",
        button_order: "Acquista (a pagamento)",
        info: "Info",
        warning: "Avviso",
        error: "Errore",
        error_occured: "Si è verificato un errore",
        error_404: "Sembra che tu abbia preso una direzione sbagliata. Ti riportiamo sulla strada giusta!",
        could_not_save: "I dati non possono essere salvati."
    },
    apps: {
        moduleName: "Applicazioni",
        singular: "Applicazione",
        slogan: "Elenco di tutte le applicazioni avviate",
        button_add_app: "Aggiungi applicazione",
        running_apps: "Applicazioni in esecuzione",
        entrypoints: "Punti di ingresso",
        button_postinstall: "Esegui post installazione",
        button_postinstall_without_ui: "Completare la post-installazione",
        choose: "Scegli applicazione",
        none: "Nessuna applicazione installata (o senza diritti)",
        ressources: {
            headline: "Risorse",
            none: "Non ci sono requisiti hardware ufficiali."
        },
        delete: {
            headline: "Sei sicuro?",
            verify: "L'applicazione e tutti i dati memorizzati saranno rimossi in modo irrevocabile."
        },
        install: {
            headline: "Installa l'applicazione",
            verify: "Sei sicuro di voler installare l'applicazione <b class=\"text-nowrap\">{{app}}</b>?",
            certificate_required: "Per eseguire questa applicazione è <u>necessario</u> installare un certificato SSL.",
            payment_first: "L'applicazione sarà disponibile <b>immediatamente dopo il pagamento</b>.",
            confirmation: "L'applicazione è stata creata e sta avviando."
        },
        options: {
            headline: "Gestisci applicazione",
            explanation: "Avvia le attività di gestione più comuni per il tuo container",
            button_start_label: "Avvia un'applicazione precedentemente fermata",
            button_delete_label: "Rimuovi l'applicazione con tutti i dati contenuti",
            button_force_delete_label: "Forza la rimozione quando nulla funziona",
            button_stop_label: "Ferma un'applicazione in esecuzione",
            button_postinstall_label: "Ripeti il processo di installazione se è fallito in precedenza",
            button_postinstall_without_ui_label: "Ripeti le ultime parti del processo di installazione fallito"
        },
        "out_of_sync": "L'applicazione non è funzionale"
    },
    users: {
        moduleName: "Utenti",
        slogan: "Gestisci quali utenti possono interagire con le applicazioni nel tuo sistema.",
        listOfAllUsers: "Elenco di tutti gli utenti",
        button_add_user: "Aggiungi utente",
        button_reset_password: "Reimposta password",
        email: "Email",
        first_name: "Nome",
        last_name: "Cognome",
        username: "Nome utente",
        role: "Ruolo",
        role_admin: "Amministratore",
        role_user: "Utente",
        dialog_add_user: "Aggiungi utente",
        dialog_edit_user: "Modifica utente",
        dialog_delete_user: "Elimina utente",
        dialog_delete_user_text: "Vuoi davvero eliminare l'utente <b>{{email}}</b>?",
        dialog_set_password: "Imposta password utente",
        dialog_initial_pwd: "Password iniziale",
        dialog_initial_pwd_text: "La password iniziale per l'utente <b>{{email}}</b> è<br><h3>{{initialPwd}}</h3><br>La password è stata copiata automaticamente negli appunti.",
        password: "Password",
        password_repeat: "Ripeti password",
        choose: "Scegli utente"
    },
    inventory: {
        moduleName: "Inventario",
        slogan: "Aggiungi applicazioni aggiuntive",
        tab_collections: "Collezioni",
        tab_installed_apps: "Applicazioni installate",
        tab_available_apps: "Applicazioni disponibili",
        tab_more_apps: "Altro",
        app_filter: "Filtra applicazioni per nome o descrizione",
        button_install: "Installa",
        button_details: "Dettagli",
        show_all_installed_apps: "Mostra tutte le applicazioni installate",
        no_permissions: "Non hai i permessi per usare questa applicazione"
    },
    invoices: {
        moduleName: "Fatture",
        slogan: "Controlla tutte le fatture relative agli abbonamenti ad applicazioni o risorse.",
        list: "Storico fatture",
        date: "Data",
        name: "Descrizione",
        none: "Non ci sono ancora fatture",
        billing: {
            headline: "Fatturazione",
            address: {
                headline: "Indirizzo di fatturazione",
                description: "Imposta l'indirizzo che verrà usato per la fatturazione"
            }
        },
        billing_periods: {
            '1m': "Fatturazione mensile",
            '3m': "Fatturazione trimestrale",
            '6m': "Fatturazione semestrale",
            '12m': "Fatturazione annuale"
        },
        number_of_users: "per {{number_of_users}} utenti",
        per_month_and_user: "per mese e utente"
    },
    stats: {
        moduleName: "Statistiche",
        slogan: "Informazioni sul tuo ambiente.",
        apps: "Applicazioni",
        cpus: "CPU",
        memory: "Memoria",
        disk: "Disco",
        running_containers: "Container in esecuzione",
        table: {
            app: "Applicazione",
            cpu: "CPU",
            memUsage_and_limit: "Memoria/Limite",
            mem_percentage: "Memoria %",
            net_io: "Rete I/O",
            block_io: "Disco I/O"
        }
    },
    permissions: {
        moduleName: "Permessi",
        slogan: "Consenti o limita l'accesso degli utenti alle applicazioni installate.",
        user2app: "Per utente",
        app2user: "Per applicazione",
        grant: "Concedi accesso",
        do_grant: "Seleziona per concedere accesso",
        no_auth_method: "Nessun login richiesto",
        assign_user_description: "Assegna utenti all'applicazione attivando la casella",
        assign_app_description: "Attiva applicazioni per questo utente attivando la casella",
        exhausted: "Il numero di licenze utente disponibili è esaurito.",
        available_licenses: "{{number}} licenze utente disponibili"
    },
    installation: {
        headline: "Monitoraggio installazione",
        done: "Installazione completata",
        states: {
            waiting: "in attesa",
            running: "in esecuzione",
            error: "fallita",
            success: "riuscita"
        },
        commands: {
            "app-stop": "Arresto applicazione",
            "app-create": "Installazione applicazione",
            "app-start": "Avvio applicazione",
            "app-delete": "Eliminazione applicazione"
        },
        post_install: "Questa applicazione necessita di alcuni processi post-installazione. Si prega di mantenere questa finestra aperta fino al completamento.",
        dialog_reset_job_queue: "Reimposta coda lavori",
        dialog_reset_job_queue_text: "Puoi svuotare la coda (eliminare tutti i lavori in esecuzione/in attesa) e riavviarla. Questo può essere utile se ci sono elementi bloccanti."
    },
    settings: {
        billing_address: {
            headline: "Specifica indirizzo di fatturazione",
            description: "Per prenotare un servizio a pagamento, devi prima fornire un indirizzo di fatturazione.",
            mandatory_fields: "Devi fornire il nome o informazioni aggiuntive.",
            save_address: "Salva",
            fields: {
                name: "Nome",
                name_placeholder: "(Azienda) Nome",
                vat: "Partita IVA",
                street: "Via",
                zipcode: "CAP",
                city: "Città",
                country: "Paese",
                additional_description: "Se il tuo indirizzo non corrisponde al formato specificato, usa il campo sottostante.",
                additional: "Informazioni aggiuntive"
            }
        },
        result: {
            success: "Impostazioni salvate.",
            error: "Salvataggio delle impostazioni fallito. Riprova."
        },
        menu: {
            change_password: "Cambia password",
            reset_job_queue: "Reimposta coda lavori",
            language: "Lingua",
            logout: "Disconnetti",
            about: "Informazioni"
        }
    },
    certificate: {
        moduleName: "Certificati SSL",
        slogan: "Proteggi l'accesso alle tue applicazioni",
        file: "File",
        filetype_hint: "Scegli un file di certificato valido (di solito con estensione *.pem).",
        dialog_add_certificate: "Carica file certificato",
        dialog_delete_certificate: "Elimina certificato",
        dialog_delete_certificate_text: "Sei sicuro di voler eliminare il certificato selezionato?",
        button_add_certificate: "Carica certificato",
        fileName: "Nome file",
        expiry: "Data di scadenza",
        domains: "Domini coperti"
    },
    installer: {
        explanation: "I passaggi necessari per l'installazione di <b class=\"text-nowrap\">{{app}}</b> verranno eseguiti ora.<p>Si prega di avere pazienza. Le installazioni iniziali richiedono tempo per scaricare ed estrarre le immagini. Alcune applicazioni possono impiegare diversi minuti per configurare contenitori funzionanti.</p>",
        step_createDocker: "Crea container Docker",
        step_addAdminPermissions: "Aggiungi permessi amministratore",
        step_upsertUsersInApp: "Sincronizza utenti con l'app",
        step_waitForContainerRunning: "Attendi che i container siano pronti",
        step_frontendPostInstall: "Esegui post-installazione nell'app",
        step_postinstall: "Esegui post-installazione nella piattaforma"
    }
};
