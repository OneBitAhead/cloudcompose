# Wiki.js

## Installation mit Docker

https://docs.requarks.io/install/docker

Es ist möglich, die Parameter über eine config.yml Datei anzugeben


## Post Install


### Admin Account
Es ist per se kein Admin Account angelegt (das geht erst ein der Version 3), der muss über einen Wizard erzeugt werden. Der Wizard führt dann folgenden Call aus, bevor er weiterleitet:

```
POST http://localhost:10003/finalize
```

Relevante Header

* Referer: http://localhost:10003/


Body:

```
{
    "adminEmail": "admin@onebitahead.com",
    "adminPassword":"123456",
    "adminPasswordConfirm":"123456",
    "siteUrl":"https://localhost",
    "telemetry":false
}
```

## Anlegen der Gruppe Users



### Authentication

Die Auth Strategy kann explizit nicht über Docker, CLI oder REST API konfiguriert werden. Es bedarf der Konfiguration über die Admin Oberfläche. In der Liste aller Provider gibt es eine Auswahl für `KeyCloak`. Wahrscheinlich müssen wir das Puppeteer machen.
Im gleichen Zuge muss dann auch der Local Auth Provider deaktiviert werden.

Dies wird auch in Wiki.js 3 der Fall sein.


Der Call geht gegen 

```
http://localhost:10003/graphql
```

Body: 
```
[
    {
        "operationName":null,
        "variables":{
            "strategies":[
                {
                    "key":"local",
                    "strategyKey":"local",
                    "displayName":"Local",
                    "order":0,
                    "isEnabled":true,
                    "config":[],
                    "selfRegistration":false,
                    "domainWhitelist":[],
                    "autoEnrollGroups":[]
                },
                {
                    "key":"9dbc0ad7-be47-49e0-bf1a-e1ade7de9198",
                    "strategyKey":"keycloak",
                    "displayName":"Keycloak",
                    "order":1,
                    "isEnabled":true,
                    "config":[
                        {"key":"host","value":"{\"v\":\"gdsf\"}"},
                        {"key":"realm","value":"{\"v\":\"gfd\"}"},
                        {"key":"clientId","value":"{\"v\":\"h\"}"},
                        {"key":"clientSecret","value":"{\"v\":\"gsdf\"}"},
                        {"key":"authorizationURL","value":"{\"v\":\"gfd\"}"},
                        {"key":"tokenURL","value":"{\"v\":\"gsdf\"}"},
                        {"key":"userInfoURL","value":"{\"v\":\"gfd\"}"},
                        {"key":"logoutUpstream","value":"{\"v\":false}"},
                        {"key":"logoutURL","value":"{\"v\":\"gfd\"}"},
                        {"key":"logoutUpstreamRedirectLegacy","value":"{\"v\":false}"}
                    ],
                    "selfRegistration":false,
                    "domainWhitelist":[],
                    "autoEnrollGroups":[]
                }
            ]
        },
        "extensions":{},
        "query":"mutation ($strategies: [AuthenticationStrategyInput]!) {\n  authentication {\n    updateStrategies(strategies: $strategies) {\n      responseResult {\n        succeeded\n        errorCode\n        slug\n        message\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    }
]
```


### Öffentlichen Zugriff entfernen

Standardmäßig können alle, auch nicht authentifizierte Benutzer die Inhalte des Wiki sehen. Um das zu beheben, müssen der Gruppe `Guests` alle Rechte entzogen werden.




### Home

Initial muss zudem der Wiki-Bereich initialisiert werden, d.h. ob Markdown, WYSIWYG, ... zum Einsatz kommen soll. Nach der Auswahl muss auch eine Startseite angelegt werden.

```
http://localhost:10003/graphql
```

Body: 
```
[
    {
        "operationName":null,
        "variables":{
            "content":"# Header\nYour content here",
            "description":"",
            "editor":"markdown",
            "locale":"en",
            "isPrivate":false,
            "isPublished":true,
            "path":"home",
            "publishEndDate":"",
            "publishStartDate":"",
            "scriptCss":"",
            "scriptJs":"",
            "tags":[],
            "title":"Start"
        },
        "extensions":{},
        "query":"mutation ($content: String!, $description: String!, $editor: String!, $isPrivate: Boolean!, $isPublished: Boolean!, $locale: String!, $path: String!, $publishEndDate: Date, $publishStartDate: Date, $scriptCss: String, $scriptJs: String, $tags: [String]!, $title: String!) {\n  pages {\n    create(content: $content, description: $description, editor: $editor, isPrivate: $isPrivate, isPublished: $isPublished, locale: $locale, path: $path, publishEndDate: $publishEndDate, publishStartDate: $publishStartDate, scriptCss: $scriptCss, scriptJs: $scriptJs, tags: $tags, title: $title) {\n      responseResult {\n        succeeded\n        errorCode\n        slug\n        message\n        __typename\n      }\n      page {\n        id\n        updatedAt\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    }
]
```

### 
