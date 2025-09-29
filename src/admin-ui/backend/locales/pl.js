module.exports = {
    language: "Polski",
    flag: "🇵🇱",
    global: {
        management: "Zarządzanie",
        state: "Stan",
        name: "Nazwa",
        button_cancel: "Anuluj",
        button_close: "Zamknij",
        button_add: "Dodaj",
        button_edit: "Edytuj",
        button_delete: "Usuń",
        button_force_delete: "Usuń na zawsze",
        button_ok: "Ok",
        button_save: "Zapisz",
        button_options: "Opcje",
        button_download: "Pobierz",
        button_start: "Uruchom",
        button_stop: "Zatrzymaj",
        button_open: "Otwórz",
        button_order: "Kup (płatne)",
        info: "Informacja",
        warning: "Ostrzeżenie",
        error: "Błąd",
        error_occured: "Wystąpił błąd",
        error_404: "Wygląda na to, że zbłądziłeś. Pomóżmy Ci wrócić na właściwą ścieżkę!",
        could_not_save: "Nie można zapisać danych."
    },
    apps: {
        moduleName: "Aplikacje",
        singular: "Aplikacja",
        slogan: "Lista wszystkich uruchomionych aplikacji",
        button_add_app: "Dodaj aplikację",
        running_apps: "Uruchomione aplikacje",
        entrypoints: "Punkty wejścia",
        button_postinstall: "Uruchom post-instalację",
        button_postinstall_without_ui: "Zakończ instalację końcową",
        choose: "Wybierz aplikację",
        none: "Żadna aplikacja nie jest zainstalowana (lub brak uprawnień)",
        ressources: {
            headline: "Zasoby",
            none: "Nie ma oficjalnych wymagań sprzętowych."
        },
        delete: {
            headline: "Czy jesteś pewien?",
            verify: "Aplikacja i wszystkie w niej zapisane dane zostaną nieodwracalnie usunięte."
        },
        install: {
            headline: "Zainstaluj aplikację",
            verify: "Czy na pewno chcesz zainstalować aplikację <b class=\"text-nowrap\">{{app}}</b>?",
            certificate_required: "Aby uruchomić tę aplikację, konieczne jest <u>zainstalowanie</u> certyfikatu SSL.",
            payment_first: "Aplikacja stanie się dostępna <b>natychmiast po otrzymaniu płatności</b>.",
            confirmation: "Aplikacja została utworzona i jest teraz uruchamiana."
        },
        options: {
            headline: "Zarządzaj aplikacją",
            explanation: "Uruchamiaj typowe zadania zarządzania kontenerem",
            button_start_label: "Uruchom wcześniej zatrzymaną aplikację",
            button_delete_label: "Usuń aplikację wraz ze wszystkimi danymi",
            button_force_delete_label: "Wymuś usunięcie, gdy nic innego nie działa",
            button_stop_label: "Zatrzymaj działającą aplikację",
            button_postinstall_label: "Powtórz instalację, jeśli wcześniej nie powiodła się",
            button_postinstall_without_ui_label: "Powtórz ostatnie części nieudanej instalacji"
        },
        "out_of_sync": "Aplikacja jest niefunkcjonalna"
    },
    users: {
        moduleName: "Użytkownicy",
        slogan: "Zarządzaj, którzy użytkownicy mogą korzystać z aplikacji w systemie.",
        listOfAllUsers: "Lista wszystkich użytkowników",
        button_add_user: "Dodaj użytkownika",
        button_reset_password: "Resetuj hasło",
        email: "E-mail",
        first_name: "Imię",
        last_name: "Nazwisko",
        username: "Nazwa użytkownika",
        role: "Rola",
        role_admin: "Administrator",
        role_user: "Użytkownik",
        dialog_add_user: "Dodaj użytkownika",
        dialog_edit_user: "Edytuj użytkownika",
        dialog_delete_user: "Usuń użytkownika",
        dialog_delete_user_text: "Czy na pewno chcesz usunąć użytkownika <b>{{email}}</b>?",
        dialog_set_password: "Ustaw hasło użytkownika",
        dialog_initial_pwd: "Hasło początkowe",
        dialog_initial_pwd_text: "Początkowe hasło użytkownika <b>{{email}}</b> to<br><h3>{{initialPwd}}</h3><br>Hasło zostało automatycznie skopiowane do schowka.",
        password: "Hasło",
        password_repeat: "Powtórz hasło",
        choose: "Wybierz użytkownika"
    },
    inventory: {
        moduleName: "Inwentarz",
        slogan: "Dodaj dodatkowe aplikacje",
        tab_collections: "Kolekcje",
        tab_installed_apps: "Zainstalowane aplikacje",
        tab_available_apps: "Dostępne aplikacje",
        tab_more_apps: "Więcej",
        app_filter: "Filtruj aplikacje według nazwy lub opisu",
        button_install: "Zainstaluj",
        button_details: "Szczegóły",
        show_all_installed_apps: "Pokaż wszystkie zainstalowane aplikacje",
        no_permissions: "Nie masz uprawnień do korzystania z tej aplikacji"
    },
    invoices: {
        moduleName: "Faktury",
        slogan: "Przeglądaj wszystkie faktury związane z subskrypcjami aplikacji lub zasobów.",
        list: "Historia faktur",
        date: "Data",
        name: "Opis",
        none: "Brak faktur",
        billing: {
            headline: "Rozliczenia",
            address: {
                headline: "Adres rozliczeniowy",
                description: "Ustaw adres używany do rozliczeń"
            }
        },
        billing_periods: {
            '1m': "Rozliczenie miesięczne",
            '3m': "Rozliczenie kwartalne",
            '6m': "Rozliczenie półroczne",
            '12m': "Rozliczenie roczne"
        },
        number_of_users: "dla {{number_of_users}} użytkowników",
        per_month_and_user: "na miesiąc i użytkownika"
    },
    stats: {
        moduleName: "Statystyki",
        slogan: "Informacje o Twoim środowisku.",
        apps: "Aplikacje",
        cpus: "Procesory",
        memory: "Pamięć",
        disk: "Dysk",
        running_containers: "Uruchomione kontenery",
        table: {
            app: "Aplikacja",
            cpu: "CPU",
            memUsage_and_limit: "Pamięć/Limit",
            mem_percentage: "Pamięć %",
            net_io: "Sieć I/O",
            block_io: "Dysk I/O"
        }
    },
    permissions: {
        moduleName: "Uprawnienia",
        slogan: "Zezwalaj lub ograniczaj dostęp użytkowników do zainstalowanych aplikacji.",
        user2app: "Według użytkownika",
        app2user: "Według aplikacji",
        grant: "Przyznaj dostęp",
        do_grant: "Zaznacz, aby przyznać dostęp",
        no_auth_method: "Brak wymogu logowania",
        assign_user_description: "Przydziel użytkowników do aplikacji, zaznaczając pole wyboru",
        assign_app_description: "Włącz aplikacje dla tego użytkownika, zaznaczając pole wyboru",
        exhausted: "Liczba dostępnych licencji użytkowników została wyczerpana.",
        available_licenses: "{{number}} dostępnych licencji użytkowników"
    },
    installation: {
        headline: "Monitor instalacji",
        done: "Instalacja zakończona",
        states: {
            waiting: "oczekiwanie",
            running: "w trakcie",
            error: "błąd",
            success: "sukces"
        },
        commands: {
            "app-stop": "Zatrzymywanie aplikacji",
            "app-create": "Instalowanie aplikacji",
            "app-start": "Uruchamianie aplikacji",
            "app-delete": "Usuwanie aplikacji"
        },
        post_install: "Ta aplikacja wymaga kilku procesów po instalacji. Proszę nie zamykać tego okna do zakończenia.",
        dialog_reset_job_queue: "Resetuj kolejkę zadań",
        dialog_reset_job_queue_text: "Możesz wyczyścić kolejkę (usunąć wszystkie bieżące/czekające zadania) i rozpocząć kolejkę na nowo. To może pomóc, jeśli kolejka jest zablokowana."
    },
    settings: {
        billing_address: {
            headline: "Podaj adres rozliczeniowy",
            description: "Aby zamówić usługę płatną, musisz najpierw podać adres rozliczeniowy.",
            mandatory_fields: "Należy podać nazwę lub dodatkowe informacje.",
            save_address: "Zapisz",
            fields: {
                name: "Nazwa",
                name_placeholder: "(Firma) Nazwa",
                vat: "NIP",
                street: "Ulica",
                zipcode: "Kod pocztowy",
                city: "Miasto",
                country: "Kraj",
                additional_description: "Jeśli Twój adres nie pasuje do podanego formatu, proszę użyć poniższego pola.",
                additional: "Informacje dodatkowe"
            }
        },
        result: {
            success: "Ustawienia zostały zapisane.",
            error: "Błąd zapisu ustawień. Spróbuj ponownie."
        },
        menu: {
            change_password: "Zmień hasło",
            reset_job_queue: "Resetuj kolejkę zadań",
            language: "Język",
            logout: "Wyloguj się",
            about: "O programie"
        }
    },
    certificate: {
        moduleName: "Certyfikaty SSL",
        slogan: "Zabezpiecz dostęp do swoich aplikacji",
        file: "Plik",
        filetype_hint: "Wybierz ważny plik certyfikatu (zazwyczaj z rozszerzeniem *.pem).",
        dialog_add_certificate: "Prześlij plik certyfikatu",
        dialog_delete_certificate: "Usuń certyfikat",
        dialog_delete_certificate_text: "Czy na pewno chcesz usunąć wybrany certyfikat?",
        button_add_certificate: "Prześlij certyfikat",
        fileName: "Nazwa pliku",
        expiry: "Data wygaśnięcia",
        domains: "Objęte domeny"
    },
    installer: {
        explanation: "Teraz zostaną wykonane niezbędne kroki instalacji <b class=\"text-nowrap\">{{app}}</b>.<p>Prosimy o cierpliwość. Pierwsza instalacja wymaga czasu na pobranie i rozpakowanie obrazów. Niektóre aplikacje mogą potrzebować kilku minut, aby uruchomić działające kontenery.</p>",
        step_createDocker: "Tworzenie kontenerów Docker",
        step_addAdminPermissions: "Dodawanie uprawnień administratora",
        step_upsertUsersInApp: "Synchronizacja użytkowników z aplikacją",
        step_waitForContainerRunning: "Oczekiwanie na gotowość kontenerów",
        step_frontendPostInstall: "Uruchomienie części aplikacyjnej procesu po instalacji",
        step_postinstall: "Uruchomienie części platformowej procesu po instalacji"
    }
};
