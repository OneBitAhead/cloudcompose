const knex = require("knex");

export default class Integration {

  #CONTEXT;

  get config() {
    return {
      "name": "Kimai",
      "tech_name": "kimai",    
      "version": "latest",
      "url": "https://kimai.org/",
      "color": "#aa3432",
      "default_auth_method": "cookie",
      "roles": ["admin", "user"],
      // with this...local passwords are generate and can be used in the injected script
      "with_local_passwords": true,
      // therefore the proxy intercepts the return value from the provided URLs and is replacing (if found)
      // auto login urls contain the URL and the replace string
      code_injection_urls: [
        {
          "patterns": ["^\/[^\/]+\/login"],
          "replaceString": `<title>Kimai</title>`,
          "code": `<title>Kimai (patched)</title>
            <script>
              (()=>{
                function checkLogin(){

                    console.log("{{email}}","{{password}}");
                 
                    // if logged in (header is set with dropdown user)
                    var userMenu = document.querySelector("#app  header ul li");
                    if(userMenu){
                      console.log("Logged in already");                    
                      return;
                    }
                    console.log("check for login form...");
                    // check for form with password field
                    var usernameField = document.querySelector("form input#username")
                    var passwordField = document.querySelector("form input#password")
                    var submitButton = document.querySelector("form button.btn-primary")
                    if(usernameField){   
                        console.log("Found login form");
                        usernameField.value = "{{email}}";
                        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                        passwordField.value = "{{password}}";
                        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
                        // click on submit
                        setTimeout(()=>{ submitButton.click(); },1);
                        return;
                    }
                    setTimeout(()=>{ checkLogin();}, 1000);
                }
                  checkLogin();
                
            })();
            </script>`
        }
      ]
    }
  }

  getContainers(tenant) {

    return {
      [`cc-app-${tenant.id}-kimai`]: {
        "image": "kimai/kimai2",
        "version": "apache",
        "dependsOn": [`cc-app-${tenant.id}-kimai-db`],
        "description": "",
        "ports": {
          8001: {"subdomain": "kimai"}
        },
        "env_params": {
          "ADMINMAIL": `tech_admin@${tenant.baseDomain}`,
          "ADMINPASS": 12345,
          "DATABASE_URL": `mysql://kimaiuser:kimaipassword@cc-app-${tenant.id}-kimai-db/kimai?charset=utf8mb4&serverVersion=8.3.0`
        },
        "volumes": {
          "data": { internalPath: "/opt/kimai/var/data", type: "rw" },
          "plugins": { internalPath: "/opt/kimai/var/plugins", type: "rw" },
          "local.yaml": { sourcePath: "./local.yaml", internalPath: "/opt/kimai/config/packages/local.yaml", type: "ro" }
        }

      },
     [`cc-app-${tenant.id}-kimai-db`]:{
        "image": "mysql",
        "version": "8.3",
        "volumes": {
          "mysql": { internalPath: "/var/lib/mysql", type: "rw" },
        },
        "ports": {
          //3306: {}
        },
        "env_params": {
          "MYSQL_DATABASE": "kimai",
          "MYSQL_USER": "kimaiuser",
          "MYSQL_PASSWORD": "kimaipassword",
          "MYSQL_ROOT_PASSWORD": "changemeplease"
        }
      }
    }

  }

  constructor(CONTEXT) {

    this.#CONTEXT = CONTEXT;

  }


  generatedVars(tenant){
        return {}
  }


  // async postinstall ( data ) {
  // }

  async upsertUsers(tenant, data, generated_vars = {}, users) {

    for (var x in users) {
      let user = users[x];
      let password = user.local_app_password;
      let role = (user.role === "admin") ? "ROLE_ADMIN" : "ROLE_USER";
      var result = await this.#CONTEXT.runCommand(`docker exec cc-app-${tenant.id}-kimai /opt/kimai/bin/console kimai:user:create ${user.username} ${user.email} ${role} ${password}`)

    }


  }

  async deleteUsers(tenant, data, generated_vars = {}, users) {

    // console.log("delete user")

    for(var x in users){
      // let user = users[x];
      // var result = await this.#CONTEXT.runCommand(`docker exec cc-app-kimai /opt/kimai/bin/console kimai:user:create ${user.username} ${user.email} ${role} ${password}`)
      // console.log(result);      
    }
  


  }


  async updatePermissions(tenant, data, generated_vars = {}, users) {


    // ROLE_USER, ROLE_TEAMLEAD, ROLE_ADMIN, and ROLE_SUPER_ADMIN

     for(var x in users){

      let user = users[x];

      if(user.appRole === "user"){
          var result = await this.#CONTEXT.runCommand(`docker exec cc-app-${tenant.id}-kimai /opt/kimai/bin/console kimai:user:demote ${user.username} ROLE_SUPER_ADMIN`)
          console.log(result);
      } else if(user.appRole === "admin"){
          var result = await this.#CONTEXT.runCommand(`docker exec cc-app-${tenant.id}-kimai /opt/kimai/bin/console kimai:user:promote ${user.username} ROLE_SUPER_ADMIN`)
          console.log(result);
      }
    }

    return;




    console.log(data);
    var container = data.containers["cc-app-kimai-db"]
    console.log(container);


    // Create the connection
    const db = knex({
      client: 'mysql2',
      connection: {
        host: "localhost",
        port: container.externalPorts[0],
        user: container.environment.MYSQL_USER,
        password: container.environment.MYSQL_PASSWORD,
        database: container.environment.MYSQL_DATABASE
      }
    });

    //var users = await db("kimai2_users");
  
  

    

    // roles (serialized php arrays) in the field "roles" of an user
    var roles = {
      "SUPER_ADMIN": `a:1:{i:0;s:16:"ROLE_SUPER_ADMIN";}`, // array with ["ROLE_SUPER_ADMIN"]
      "ADMIN": `a:1:{i:0;s:10:"ROLE_ADMIN";}`,  // array with ["ROLE_ADMIN"]
      "USER": `a:0:{}` // empty array []
    }

    // testing
    for (var x in users) {

      let user = users[x];
      console.log("KIMAI: update permission: ", user.username, user);

      if (user.appRole === "user") {

          var update = await db("kimai2_users").where("username", user.username).update({"roles": roles["USER"]});
          console.log(update);

      } else if (user.appRole === "admin") {

        // set the super_admin_role ?!
        var update = await db("kimai2_users").where("username", user.username).update({"roles": roles["SUPER_ADMIN"]});
        console.log(update);

      }
    }


  }


}