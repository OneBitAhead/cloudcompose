module.exports = {
    language: "Español",
    flag: "🇪🇸",
    global: {
        management: "Gestión",
        state: "Estado",
        name: "Nombre",
        button_cancel: "Cancelar",
        button_close: "Cerrar",
        button_add: "Añadir",
        button_edit: "Editar",
        button_delete: "Eliminar",
        button_force_delete: "Eliminar definitivamente",
        button_ok: "Ok",
        button_save: "Guardar",
        button_options: "Opciones",
        button_download: "Descargar",
        button_start: "Iniciar",
        button_stop: "Detener",
        button_open: "Abrir",
        button_order: "Comprar (con costos)",
        info: "Información",
        warning: "Advertencia",
        error: "Error",
        error_occured: "Ocurrió un error",
        error_404: "Parece que te has perdido. ¡Vamos a regresar al camino!",
        could_not_save: "No se pudieron guardar los datos."
    },
    apps: {
        moduleName: "Aplicaciones",
        singular: "Aplicación",
        slogan: "Lista de todas las aplicaciones iniciadas",
        button_add_app: "Agregar aplicación",
        running_apps: "Aplicaciones en ejecución",
        entrypoints: "Puntos de entrada",
        button_postinstall: "Ejecutar post-instalación",
        button_postinstall_without_ui: "Completar la post-instalación",
        choose: "Elegir aplicación",
        none: "No hay ninguna aplicación instalada (o sin permisos)",
        ressources: {
            headline: "Recursos",
            none: "No hay requisitos oficiales de hardware."
        },
        delete: {
            headline: "¿Estás seguro?",
            verify: "La aplicación y todos los datos almacenados en ella serán eliminados irrevocablemente."
        },
        install: {
            headline: "Instalar la aplicación",
            verify: "¿Estás seguro de que deseas instalar la aplicación <b class=\"text-nowrap\">{{app}}</b>?",
            certificate_required: "Para ejecutar esta aplicación, es <u>obligatorio</u> instalar un certificado SSL.",
            payment_first: "La aplicación estará disponible <b>inmediatamente después del pago</b>.",
            confirmation: "La aplicación ha sido creada y está iniciando."
        },
        options: {
            headline: "Administrar aplicación",
            explanation: "Iniciar tareas comunes de gestión para tu contenedor",
            button_start_label: "Iniciar una aplicación previamente detenida",
            button_delete_label: "Eliminar la aplicación con todos sus datos",
            button_force_delete_label: "Forzar eliminación cuando nada más funciona",
            button_stop_label: "Detener una aplicación en ejecución",
            button_postinstall_label: "Repetir proceso de instalación si falló antes",
            button_postinstall_without_ui_label: "Repetir últimas partes del proceso fallido"
        },
        "out_of_sync": "La aplicación no funciona"
    },
    users: {
        moduleName: "Usuarios",
        slogan: "Gestionar qué usuarios pueden interactuar con las aplicaciones en tu sistema.",
        listOfAllUsers: "Lista de todos los usuarios",
        button_add_user: "Agregar usuario",
        button_reset_password: "Restablecer contraseña",
        email: "Correo electrónico",
        first_name: "Nombre",
        last_name: "Apellido",
        username: "Nombre de usuario",
        role: "Rol",
        role_admin: "Administrador",
        role_user: "Usuario",
        dialog_add_user: "Agregar usuario",
        dialog_edit_user: "Editar usuario",
        dialog_delete_user: "Eliminar usuario",
        dialog_delete_user_text: "¿Realmente deseas eliminar al usuario <b>{{email}}</b>?",
        dialog_set_password: "Establecer contraseña",
        dialog_initial_pwd: "Contraseña inicial",
        dialog_initial_pwd_text: "La contraseña inicial para el usuario <b>{{email}}</b> es<br><h3>{{initialPwd}}</h3><br>La contraseña fue copiada automáticamente al portapapeles.",
        password: "Contraseña",
        password_repeat: "Repetir contraseña",
        choose: "Elegir usuario"
    },
    inventory: {
        moduleName: "Inventario",
        slogan: "Agregar aplicaciones adicionales",
        tab_collections: "Colecciones",
        tab_installed_apps: "Aplicaciones instaladas",
        tab_available_apps: "Aplicaciones disponibles",
        tab_more_apps: "Más",
        app_filter: "Filtrar aplicaciones por nombre o descripción",
        button_install: "Instalar",
        button_details: "Detalles",
        show_all_installed_apps: "Mostrar todas las aplicaciones instaladas",
        no_permissions: "No tienes permisos para usar esta aplicación"
    },
    invoices: {
        moduleName: "Facturas",
        slogan: "Revisar todas las facturas relacionadas con suscripciones de aplicaciones o recursos.",
        list: "Historial de facturas",
        date: "Fecha",
        name: "Descripción",
        none: "No hay facturas todavía",
        billing: {
            headline: "Facturación",
            address: {
                headline: "Dirección de facturación",
                description: "Establece la dirección que se usará para la facturación"
            }
        },
        billing_periods: {
            "1m": "Facturación mensual",
            "3m": "Facturación trimestral",
            "6m": "Facturación semestral",
            "12m": "Facturación anual"
        },
        number_of_users: "para {{number_of_users}} usuarios",
        per_month_and_user: "por mes y usuario"
    },
    stats: {
        moduleName: "Estadísticas",
        slogan: "Información sobre tu entorno.",
        apps: "Aplicaciones",
        cpus: "CPUs",
        memory: "Memoria",
        disk: "Disco",
        running_containers: "Contenedores en ejecución",
        table: {
            app: "Aplicación",
            cpu: "CPU",
            memUsage_and_limit: "Memoria/Límite",
            mem_percentage: "Memoria %",
            net_io: "Red I/O",
            block_io: "Disco I/O"
        }
    },
    permissions: {
        moduleName: "Permisos",
        slogan: "Permitir o restringir el acceso de usuario a las aplicaciones instaladas.",
        user2app: "Por usuario",
        app2user: "Por aplicación",
        grant: "Conceder acceso",
        do_grant: "Marcar para conceder acceso",
        no_auth_method: "No es necesario iniciar sesión",
        assign_user_description: "Asignar usuarios a la aplicación marcando la casilla",
        assign_app_description: "Activar aplicaciones para este usuario marcando la casilla",
        exhausted: "El número de licencias de usuario disponibles ya está agotado.",
        available_licenses: "{{number}} licencias de usuario disponibles"
    },
    installation: {
        headline: "Monitor de instalación",
        done: "Instalación completada",
        states: {
            waiting: "esperando",
            running: "en ejecución",
            error: "falló",
            success: "éxito"
        },
        commands: {
            "app-stop": "Deteniendo aplicación",
            "app-create": "Instalando aplicación",
            "app-start": "Iniciando aplicación",
            "app-delete": "Eliminando aplicación"
        },
        post_install: "Esta aplicación necesita algunos procesos de post-instalación. Por favor, mantenga esta ventana abierta hasta que termine.",
        dialog_reset_job_queue: "Reiniciar cola de trabajos",
        dialog_reset_job_queue_text: "Puede vaciar la cola (eliminar todos los trabajos en ejecución/espera) y reiniciar la cola. Esto puede ser útil si hay elementos bloqueando la cola."
    },
    settings: {
        billing_address: {
            headline: "Especificar dirección de facturación",
            description: "Para reservar un servicio pago, primero debe proporcionar una dirección de facturación.",
            mandatory_fields: "Se debe proporcionar el nombre o información adicional.",
            save_address: "Guardar",
            fields: {
                name: "Nombre",
                name_placeholder: "(Compañía) Nombre",
                vat: "ID de IVA",
                street: "Calle",
                zipcode: "Código postal",
                city: "Ciudad",
                country: "País",
                additional_description: "Si su dirección no coincide con el formato especificado, utilice el campo a continuación.",
                additional: "Información adicional"
            }
        },
        result: {
            success: "Los ajustes se han guardado.",
            error: "Error al guardar los ajustes. Por favor, inténtelo de nuevo."
        },
        menu: {
            change_password: "Cambiar contraseña",
            reset_job_queue: "Reiniciar cola de trabajos",
            language: "Idioma",
            logout: "Cerrar sesión",
            about: "Acerca de"
        }
    },
    certificate: {
        moduleName: "Certificados SSL",
        slogan: "Asegure el acceso a sus aplicaciones",
        file: "Archivo",
        filetype_hint: "Seleccione un archivo de certificado válido (normalmente con extensión *.pem).",
        dialog_add_certificate: "Subir archivo de certificado",
        dialog_delete_certificate: "Eliminar certificado",
        dialog_delete_certificate_text: "¿Está seguro de que desea eliminar el certificado seleccionado?",
        button_add_certificate: "Subir certificado",
        fileName: "Nombre del archivo",
        expiry: "Fecha de expiración",
        domains: "Dominios cubiertos"
    },
    installer: {
        explanation: "Los siguientes pasos necesarios para la instalación de <b class=\"text-nowrap\">{{app}}</b> se llevarán a cabo ahora. <p>Tenga paciencia. Las instalaciones iniciales requieren tiempo para descargar y extraer las imágenes. Algunas aplicaciones pueden tardar varios minutos en configurar contenedores en buen estado.</p>",
        step_createDocker: "Crear contenedores Docker",
        step_addAdminPermissions: "Agregar permisos de administrador",
        step_upsertUsersInApp: "Sincronizar usuarios con la aplicación",
        step_waitForContainerRunning: "Esperar a que los contenedores estén saludables",
        step_frontendPostInstall: "Ejecutar parte de post-instalación en la aplicación",
        step_postinstall: "Ejecutar parte de post-instalación en la plataforma"
    }
};
