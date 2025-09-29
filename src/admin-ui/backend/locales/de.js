module.exports = {
    language: "Deutsch",
    flag: "🇩🇪",
    global: {
        management: "Verwaltung",
        state: "Status",
        name: "Name",
        button_cancel: "Abbrechen",
        button_close: "Schließen",
        button_add: "Hinzufügen",
        button_edit: "Bearbeiten",
        button_delete: "Löschen",
        button_force_delete: "Endgültig löschen",
        button_ok: "Ok",
        button_save: "Speichern",
        button_options: "Optionen",
        button_download: "Herunterladen",
        button_start: "Starten",
        button_stop: "Stoppen",
        button_open: "Öffnen",
        button_order: "Kostenpflichtig buchen",
        info: "Info",
        warning: "Warnung",
        error: "Fehler",
        error_occured: "Ein Fehler ist aufgetreten",
        error_404: "Sieht so aus, als wären Sie vom Weg abgekommen. Wir bringen Sie zurück!",
        could_not_save: "Die Daten konnten nicht gespeichert werden."
    },
    apps: {
        moduleName: "Anwendungen",
        singular: "Anwendung",
        slogan: "Liste aller gestarteten Anwendungen",
        button_add_app: "Anwendung hinzufügen",
        running_apps: "Laufende Anwendungen",
        entrypoints: "Einstiegspunkte",
        button_postinstall: "Nachinstallation ausführen",
        button_postinstall_without_ui: "Nachinstallation beenden",
        choose: "Anwendung auswählen",
        none: "Keine Anwendung ist installiert (oder keine Rechte)",
        ressources: {
            "headline": "Ressourcen",
            "none": "Es gibt keine offiziellen Hardwareanforderungen."
        },
        delete: {
            headline: "Sind Sie sicher?",
            verify: "Die Anwendung und alle darin gespeicherten Daten werden unwiderruflich entfernt."
        },
        install: {
            headline: "Anwendung installieren",
            verify: "Sind Sie sicher, dass Sie die Anwendung <b class=\"text-nowrap\">{{app}}</b> installieren möchten?",
            certificate_required: "Zum Betreiben dieser Anwendung ist es <u>erforderlich</u>, ein SSL-Zertifikat zu installieren.",
            payment_first: "Die Anwendung steht sofort <b>nach Zahlungseingang</b> zur Verfügung.",
            confirmation: "Die Anwendung wurde erstellt und wird nun gestartet."
        },
        options: {
            headline: "Anwendung verwalten",
            explanation: "Starten Sie gängige Verwaltungsaufgaben für Ihren Container",
            button_start_label: "Eine zuvor gestoppte Anwendung starten",
            button_delete_label: "Anwendung mit allen enthaltenen Daten entfernen",
            button_force_delete_label: "Entfernung erzwingen, wenn nichts anderes funktioniert",
            button_stop_label: "Eine laufende Anwendung stoppen",
            button_postinstall_label: "Installationsprozess wiederholen, wenn dieser zuvor fehlgeschlagen ist",
            button_postinstall_without_ui_label: "Letzte Teile des fehlgeschlagenen Installationsprozesses wiederholen"
        },
        "out_of_sync": "Die Anwendung ist funktionsunfähig"
    },
    users: {
        moduleName: "Benutzer",
        slogan: "Verwalten Sie, welche Benutzer mit Anwendungen in Ihrem System interagieren können.",
        listOfAllUsers: "Liste aller Benutzer",
        button_add_user: "Benutzer hinzufügen",
        button_reset_password: "Passwort zurücksetzen",
        email: "E-Mail",
        first_name: "Vorname",
        last_name: "Nachname",
        username: "Benutzername",
        role: "Rolle",
        role_admin: "Administrator",
        role_user: "Benutzer",
        dialog_add_user: "Benutzer hinzufügen",
        dialog_edit_user: "Benutzer bearbeiten",
        dialog_delete_user: "Benutzer löschen",
        dialog_delete_user_text: "Möchten Sie den Benutzer <b>{{email}}</b> wirklich löschen?",
        dialog_set_password: "Benutzerpasswort setzen",
        dialog_initial_pwd: "Anfangspasswort",
        dialog_initial_pwd_text: "Das Anfangspasswort für den Benutzer <b>{{email}}</b> lautet<br><h3>{{initialPwd}}</h3><br>Das Passwort wurde automatisch in die Zwischenablage kopiert.",
        password: "Passwort",
        password_repeat: "Passwort wiederholen",
        choose: "Benutzer auswählen"
    },
    inventory: {
        moduleName: "Inventar",
        slogan: "Weitere Anwendungen hinzufügen",
        tab_collections: "Sammlungen",
        tab_installed_apps: "Installierte Anwendungen",
        tab_available_apps: "Verfügbare Anwendungen",
        tab_more_apps: "Weitere",
        app_filter: "Anwendungen nach Name oder Beschreibung filtern",
        button_install: "Installieren",
        button_details: "Details",
        show_all_installed_apps: "Alle anzeigen",
        no_permissions: "Um diese Anwendung zu nutzen, müssen Sie Berechtigungen zuordnen"
    },
    invoices: {
        moduleName: "Rechnungen",
        slogan: "Überprüfen Sie alle Rechnungen im Zusammenhang mit Anwendungs- oder Ressourcen-Abonnements.",
        list: "Rechnungshistorie",
        date: "Datum",
        name: "Beschreibung",
        none: "Es liegen noch keine Rechnungen vor",
        billing: {
            headline: "Verwaltung",
            address: {
                headline: "Rechnungsaddresse",
                description: "Legen Sie eine Adresse fest, die für Rechnungen verwendet wird."
            }
        },
        billing_periods: {
            '1m': "Monats-Abrechnung",
            '3m': "Quartals-Abrechnung",
            '6m': "Halbjahres-Abrechnung",
            '12m': "Jahres-Abrechnung"
        },
        number_of_users: "für {{number_of_users}} Nutzer",
        per_month_and_user: "pro Monat und Nutzer"
    },
    stats: {
        moduleName: "Statistiken",
        slogan: "Einblicke in Ihre Umgebung.",
        apps: "Anwendungen",
        cpus: "CPUs",
        memory: "Arbeitsspeicher",
        disk: "Festplatte",
        running_containers: "Laufende Container",
        table: {
            app: "Anwendung",
            cpu: "CPU",
            memUsage_and_limit: "Speicher/Limit",
            mem_percentage: "Speicher %",
            net_io: "Netzwerk-I/O",
            block_io: "Festplatten-I/O"
        }
    },
    permissions: {
        moduleName: "Berechtigungen",
        slogan: "Zugriff der Benutzer auf installierte Anwendungen erlauben oder einschränken.",
        user2app: "Nach Benutzer",
        app2user: "Nach Anwendung",
        grant: "Zugriff gewähren",
        do_grant: "Zugriff gewähren aktivieren",
        no_auth_method: "Kein Login erforderlich",
        assign_user_description: "Benutzer der Anwendung zuweisen, indem Sie das Kontrollkästchen aktivieren",
        assign_app_description: "Anwendungen für diesen Benutzer aktivieren, indem Sie das Kontrollkästchen aktivieren",
        exhausted: "Die Anzahl verfügbarer Nutzerlizenzen ist schon ausgeschöpft.",
        available_licenses: "{{number}} Nutzerlizenzen verfügbar"
    },
    installation: {
        headline: "Installationsmonitor",
        done: "Installation abgeschlossen",
        states: {
            waiting: "wartend",
            running: "läuft",
            error: "fehlgeschlagen",
            success: "erfolgreich"
        },
        commands: {
            "app-stop": "Anwendung stoppen",
            "app-create": "Anwendung installieren",
            "app-create-postinstall": "Anwendung einrichten",
            "app-start": "Anwendung starten",
            "app-delete": "Anwendung löschen"
        },
        post_install: "Diese Anwendung benötigt einige Nachinstallationsprozesse. Bitte halten Sie dieses Fenster geöffnet, bis der Vorgang abgeschlossen ist.",
        dialog_reset_job_queue: "Job-Warteschlange zurücksetzen",
        dialog_reset_job_queue_text: "Sie können die Warteschlange leeren (alle laufenden/wartenden Jobs löschen) und neu starten. Dies kann helfen, wenn es blockierende Warteschlangeneinträge gibt."
    },
    settings: {
        billing_address: {
            headline: "Rechnungsadresse angeben",
            description: "Um einen kostenpflichtigen Dienst zu buchen, müssen Sie zunächst eine Rechnungsadresse angeben.",
            mandatory_fields: "Entweder Name oder zusätzliche Informationen müssen angegeben werden.",
            save_address: "Speichern",
            fields: {
                name: "Name",
                name_placeholder: "(Firma) Name",
                vat: "USt-ID",
                street: "Straße",
                zipcode: "Postleitzahl",
                city: "Stadt",
                country: "Land",
                additional_description: "Falls Ihre Adresse nicht dem angegebenen Format entspricht, benutzen Sie bitte das Feld unten.",
                additional: "Zusätzliche Informationen"
            }
        },
        result: {
            success: "Die Einstellungen wurden gespeichert.",
            error: "Speichern der Einstellungen fehlgeschlagen. Bitte erneut versuchen."
        },
        menu: {
            change_password: "Passwort ändern",
            reset_job_queue: "Job-Warteschlange zurücksetzen",
            language: "Sprache",
            logout: "Abmelden",
            about: "Über"
        }
    },
    certificate: {
        moduleName: "SSL-Zertifikate",
        slogan: "Sichern Sie den Zugriff auf Ihre Anwendungen",
        file: "Datei",
        filetype_hint: "Wählen Sie eine gültige Zertifikatsdatei (häufig mit *.pem-Endung).",
        dialog_add_certificate: "Zertifikatsdatei hochladen",
        dialog_delete_certificate: "Zertifikat löschen",
        dialog_delete_certificate_text: "Soll das ausgewählte Zertifikat wirklich entfernt werden?",
        button_add_certificate: "Zertifikat hochladen",
        fileName: "Dateiname",
        expiry: "Ablaufdatum",
        domains: "Abgedeckte Domains"
    },
    installer: {
        explanation: "Im Folgenden werden die notwendigen Schritte für die Installation von <b class=\"text-nowrap\">{{app}}</b> durchgeführt.<p>Bitte haben Sie Geduld. Erstinstallationen benötigen Zeit, um Images herunterzuladen und zu entpacken. Bei einigen Anwendungen kann es mehrere Minuten dauern, bis gesunde Container eingerichtet sind.</p>",
        step_createDocker: "Docker-Container anlegen",
        step_addAdminPermissions: "Admin-Rechte vergeben",
        step_upsertUsersInApp: "Benutzer mit Anwendung synchronisieren",
        step_waitForContainerRunning: "Auf gesund laufende Container warten",
        step_frontendPostInstall: "Nachinstallationsprozess (Applikation)",
        step_postinstall: "Nachinstallationsprozess (Plattform)"
    }
};
