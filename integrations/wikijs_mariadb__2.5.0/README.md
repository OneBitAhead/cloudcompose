# Wiki.js

Nach dem Start des Containers müssen die wesentlichen Einstellungen idR über die Oberfläche eingetragen werden.
Das betrifft im Wesentlichen: 
1. Anlegen des Administrator-Users
2. Anlegen der ersten Wiki-Seite
3. Konfiguration der nativen Keycloak Anbindung

Eine API ist explizit nicht vorgesehen. Während sich der erste Schritt leicht mit einem unauthorisierten REST Call lösen lässt, sind die weiteren Schritte in der UI komplex und lassen sich besser per SQL lösen.