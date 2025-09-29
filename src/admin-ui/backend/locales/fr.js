module.exports = {
    language: "Français",
    flag: "🇫🇷",
    global: {
        management: "Gestion",
        state: "Statut",
        name: "Nom",
        button_cancel: "Annuler",
        button_close: "Fermer",
        button_add: "Ajouter",
        button_edit: "Modifier",
        button_delete: "Supprimer",
        button_force_delete: "Supprimer définitivement",
        button_ok: "Ok",
        button_save: "Enregistrer",
        button_options: "Options",
        button_download: "Télécharger",
        button_start: "Démarrer",
        button_stop: "Arrêter",
        button_open: "Ouvrir",
        button_order: "Acheter (payant)",
        info: "Info",
        warning: "Avertissement",
        error: "Erreur",
        error_occured: "Une erreur s'est produite",
        error_404: "Il semble que vous vous êtes égaré. Revenons sur le bon chemin !",
        could_not_save: "Les données n'ont pas pu être enregistrées."
    },
    apps: {
        moduleName: "Applications",
        singular: "Application",
        slogan: "Liste de toutes les applications démarrées",
        button_add_app: "Ajouter une application",
        running_apps: "Applications en cours d'exécution",
        entrypoints: "Points d'entrée",
        button_postinstall: "Exécuter post-installation",
        button_postinstall_without_ui: "Terminer l'installation postérieure",
        choose: "Choisir une application",
        none: "Aucune application installée (ou sans droits)",
        ressources: {
            headline: "Ressources",
            none: "Il n'y a pas d'exigences matérielles officielles."
        },
        delete: {
            headline: "Êtes-vous sûr ?",
            verify: "L'application et toutes les données stockées seront supprimées de façon irréversible."
        },
        install: {
            headline: "Installer l'application",
            verify: "Êtes-vous sûr de vouloir installer l'application <b class=\"text-nowrap\">{{app}}</b> ?",
            certificate_required: "Pour utiliser cette application, il est <u>nécessaire</u> d'installer un certificat SSL.",
            payment_first: "L'application devient disponible <b>immédiatement après le paiement</b>.",
            confirmation: "L'application a été créée et démarre maintenant."
        },
        options: {
            headline: "Gérer l'application",
            explanation: "Lancez les tâches courantes de gestion pour votre conteneur",
            button_start_label: "Démarrer une application arrêtée précédemment",
            button_delete_label: "Supprimer l'application avec toutes ses données",
            button_force_delete_label: "Forcer la suppression si rien d'autre ne fonctionne",
            button_stop_label: "Arrêter une application en cours",
            button_postinstall_label: "Répéter le processus d'installation en cas d'échec précédent",
            button_postinstall_without_ui_label: "Répéter les dernières parties du processus d'installation échoué"
        },
        "out_of_sync": "L'application est non fonctionnelle"
    },
    users: {
        moduleName: "Utilisateurs",
        slogan: "Gérez quels utilisateurs peuvent interagir avec les applications de votre système.",
        listOfAllUsers: "Liste de tous les utilisateurs",
        button_add_user: "Ajouter un utilisateur",
        button_reset_password: "Réinitialiser le mot de passe",
        email: "E-mail",
        first_name: "Prénom",
        last_name: "Nom",
        username: "Nom d'utilisateur",
        role: "Rôle",
        role_admin: "Administrateur",
        role_user: "Utilisateur",
        dialog_add_user: "Ajouter un utilisateur",
        dialog_edit_user: "Modifier un utilisateur",
        dialog_delete_user: "Supprimer un utilisateur",
        dialog_delete_user_text: "Voulez-vous vraiment supprimer l'utilisateur <b>{{email}}</b> ?",
        dialog_set_password: "Définir le mot de passe utilisateur",
        dialog_initial_pwd: "Mot de passe initial",
        dialog_initial_pwd_text: "Le mot de passe initial pour l'utilisateur <b>{{email}}</b> est<br><h3>{{initialPwd}}</h3><br>Le mot de passe a été automatiquement copié dans le presse-papiers.",
        password: "Mot de passe",
        password_repeat: "Répéter le mot de passe",
        choose: "Choisir un utilisateur"
    },
    inventory: {
        moduleName: "Inventaire",
        slogan: "Ajouter des applications supplémentaires",
        tab_collections: "Collections",
        tab_installed_apps: "Applications installées",
        tab_available_apps: "Applications disponibles",
        tab_more_apps: "Plus",
        app_filter: "Filtrer les applications par nom ou description",
        button_install: "Installer",
        button_details: "Détails",
        show_all_installed_apps: "Montrer toutes les applications installées",
        no_permissions: "Vous n'avez pas les droits nécessaires pour utiliser cette application"
    },
    invoices: {
        moduleName: "Factures",
        slogan: "Consultez toutes les factures relatives aux abonnements d'application ou de ressources.",
        list: "Historique des factures",
        date: "Date",
        name: "Description",
        none: "Aucune facture pour le moment",
        billing: {
            headline: "Facturation",
            address: {
                headline: "Adresse de facturation",
                description: "Définissez l'adresse qui sera utilisée pour la facturation"
            }
        },
        billing_periods: {
            '1m': "Facturation mensuelle",
            '3m': "Facturation trimestrielle",
            '6m': "Facturation semestrielle",
            '12m': "Facturation annuelle"
        },
        number_of_users: "pour {{number_of_users}} utilisateurs",
        per_month_and_user: "par mois et utilisateur"
    },
    stats: {
        moduleName: "Statistiques",
        slogan: "Aperçu de votre environnement.",
        apps: "Applications",
        cpus: "CPUs",
        memory: "Mémoire",
        disk: "Disque",
        running_containers: "Conteneurs en cours d'exécution",
        table: {
            app: "Application",
            cpu: "CPU",
            memUsage_and_limit: "Mémoire/Limite",
            mem_percentage: "Mémoire %",
            net_io: "Réseau I/O",
            block_io: "Disque I/O"
        }
    },
    permissions: {
        moduleName: "Permissions",
        slogan: "Autoriser ou restreindre l'accès des utilisateurs aux applications installées.",
        user2app: "Par utilisateur",
        app2user: "Par application",
        grant: "Accorder l'accès",
        do_grant: "Cocher pour accorder l'accès",
        no_auth_method: "Aucune connexion requise",
        assign_user_description: "Attribuer des utilisateurs à l'application en activant la case à cocher",
        assign_app_description: "Activer les applications pour cet utilisateur en activant la case à cocher",
        exhausted: "Le nombre de licences utilisateur disponibles est déjà épuisé.",
        available_licenses: "{{number}} licences utilisateur disponibles"
    },
    installation: {
        headline: "Moniteur d'installation",
        done: "Installation terminée",
        states: {
            waiting: "en attente",
            running: "en cours",
            error: "échoué",
            success: "réussi"
        },
        commands: {
            "app-stop": "Arrêt de l'application",
            "app-create": "Installation de l'application",
            "app-start": "Démarrage de l'application",
            "app-delete": "Suppression de l'application"
        },
        post_install: "Cette application nécessite certains traitements post-installation. Veuillez garder cette fenêtre ouverte jusqu'à la fin.",
        dialog_reset_job_queue: "Réinitialiser la file d'attente",
        dialog_reset_job_queue_text: "Vous pouvez vider la file d'attente (supprimer toutes les tâches en cours/en attente) et redémarrer la file d'attente. Ceci peut être utile en cas de blocage."
    },
    settings: {
        billing_address: {
            headline: "Spécifier l'adresse de facturation",
            description: "Pour réserver un service payant, vous devez d'abord fournir une adresse de facturation.",
            mandatory_fields: "Le nom ou des informations supplémentaires doivent être fournis.",
            save_address: "Enregistrer",
            fields: {
                name: "Nom",
                name_placeholder: "(Entreprise) Nom",
                vat: "ID TVA",
                street: "Rue",
                zipcode: "Code postal",
                city: "Ville",
                country: "Pays",
                additional_description: "Si votre adresse ne correspond pas au format indiqué, veuillez utiliser le champ ci-dessous.",
                additional: "Informations supplémentaires"
            }
        },
        result: {
            success: "Les paramètres ont été enregistrés.",
            error: "Échec de l'enregistrement des paramètres. Veuillez réessayer."
        },
        menu: {
            change_password: "Changer le mot de passe",
            reset_job_queue: "Réinitialiser la file d'attente",
            language: "Langue",
            logout: "Déconnexion",
            about: "À propos"
        }
    },
    certificate: {
        moduleName: "Certificats SSL",
        slogan: "Sécurisez l'accès à vos applications",
        file: "Fichier",
        filetype_hint: "Choisissez un fichier valide de certificat (généralement avec l'extension *.pem).",
        dialog_add_certificate: "Télécharger le fichier de certificat",
        dialog_delete_certificate: "Supprimer le certificat",
        dialog_delete_certificate_text: "Êtes-vous sûr de vouloir supprimer le certificat sélectionné ?",
        button_add_certificate: "Télécharger le certificat",
        fileName: "Nom du fichier",
        expiry: "Date d'expiration",
        domains: "Domaines couverts"
    },
    installer: {
        explanation: "Les étapes nécessaires à l'installation de <b class=\"text-nowrap\">{{app}}</b> vont maintenant être effectuées.<p>Veuillez patienter. Les premières installations nécessitent du temps pour télécharger et extraire les images. Certaines applications peuvent prendre plusieurs minutes pour configurer des conteneurs sains.</p>",
        step_createDocker: "Créer les conteneurs Docker",
        step_addAdminPermissions: "Ajouter les droits administrateur",
        step_upsertUsersInApp: "Synchroniser les utilisateurs avec l'application",
        step_waitForContainerRunning: "Attendre que les conteneurs soient opérationnels",
        step_frontendPostInstall: "Exécuter la partie post-installation de l'application",
        step_postinstall: "Exécuter la partie post-installation de la plateforme"
    }
};
