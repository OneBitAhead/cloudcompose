| Application | Status | Comment |
| ----------- | ------ | ------- |
| dozzle | works | - |
| Excalidraw | works | Does not contain collaboration service |
| Kimai | works | - |
| Metabase | works without user sync | - | 
| NocoDB | works without user sync | - | 
| Papermerge | does not work | Returns 404 with CORS |
| draw.io | works | - |
| keila | works | - |
| radicale | works | - |
| uptime kuma | works | - |
| Freescout | Cannot access API because it's a paid module |
| Pocketbase | not working | Not worth it: single user with complex init setup, container env does not work |





# Docmost

Docmost erlaubt kein SSO in der Community Version

## Installation mit Docker

Installation URL: https://docmost.com/docs/installation

Anpassungen an der docker-compose.yml, speziell an der Variable APP_SECRET, damit der Server startet

## Post Install Anpassungen

Es ist per se kein Workspace angelegt, der muss über einen Wizard erzeugt werden. Der Wizard führt dann folgenden Call aus, bevor er weiterleitet:

```
POST http://localhost:30000/api/auth/setup
```

Relevante Header

* Referer http://localhost:30000/setup/register

Body
```
{
    "workspaceName": "Testkunde1",
    "name": "admin",
    "email": "admin@onebitahead.com",
    "password": "12345678"
}
```