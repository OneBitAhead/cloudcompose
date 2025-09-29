// nodejs
const { exec } = require('node:child_process');
const util = require('node:util');
const execAsync = util.promisify(exec);
// own stuff
const Socket = require('./core/libs/Socket.js');
const Docker = require("./core/libs/Docker.js");
const DockerLog = require("./core/libs/DockerLog.js");
const Haproxy = require("./core/libs/Haproxy.js");
const Integrations = require("./core/libs/Integrations.js");
const KeycloakCommands = require("./core/KeycloakCommands.js");
const DockerCommands = require("./core/DockerCommands.js");
const AppCommands = require("./core/AppCommands.js");
const HaproxyCommands = require("./core/HaproxyCommands.js");

// Logging
let GLOBAL_LOG_LEVEL = (process.env.LOG_LEVEL && process.env.LOG_LEVEL !== "") ? process.env.LOG_LEVEL:"info";
require("./core/libs/Logging.js")(GLOBAL_LOG_LEVEL);
//log.setLevel("Keycloak", "debug");
//log.setLevel("Iptables", "debug")
//log.setLevel("Docker", "debug");
//log.setLevel("DockerLog", "debug");


class Manager {

  #CONTEXT;

  constructor() {
    this.#init();
  }

  async #init() {

    // check for SUDO RIGHTS!!!
    if (!process.getuid || process.getuid() !== 0) {
      log.fatal("App", "PLEASE RUN WITH SUDO RIGHTS OR AS ROOT USER");
      process.exit(1);
    }

    this.#CONTEXT = {
      tenants:{},
      USE_KEYCLOAK: (process.env.KC_DOMAIN.trim()==="") ? false: true
    };
    // Create socket connection object (but not yet start it)
    this.#CONTEXT.con = new Socket(this.#CONTEXT);     

    globalThis.require = require;

    // Load integrations and WAIT for it
    this.#CONTEXT.Integrations = new Integrations(this.#CONTEXT);
    await this.#CONTEXT.Integrations.init();
 
    // init ContainerManagement
    this.#CONTEXT.docker = new Docker(this.#CONTEXT);
    this.#CONTEXT.Haproxy = new Haproxy(this.#CONTEXT);



    // TEST
    // var d = new DockerLog(this.#CONTEXT, 'cc-app-cc-gitea','2h');
    // setTimeout(()=>{
    //   d.stop();
    // },20000)



    this.#CONTEXT.runCommand = async function (cmd, options, debug) {
      try {
        const { stdout, stderr } = await execAsync(cmd, options);
        if(debug) console.log('stdout:', stdout);
        if(debug) console.log('stderr:', stderr);
        return { code: 0, stdout, stderr };
      } catch (error) {
        log.error("Command", {stdout: error.stdout}, `Command '${cmd}' failed with code: ${error.code}`);
        return { code: error.code, stdout: null, stderr: error.stderr };
      }
    }

    //##################
    // API (via socket)
    //##################
    if(this.#CONTEXT.USE_KEYCLOAK) new KeycloakCommands(this.#CONTEXT);
    new DockerCommands(this.#CONTEXT);
    new AppCommands(this.#CONTEXT);
    new HaproxyCommands(this.#CONTEXT);

    process.on('unhandledRejection', error => {
      log.error('App', error, 'Unhandled rejection');
    });
    // NOW init the connection (so the admin-ui can connect)
    await this.#CONTEXT.con.init();

    log.info("App",`CLOUD COMPOSE VERSION: ${process.env.VERSION}`);

  }

}


new Manager();

