
const fsp = require("node:fs/promises");
const path = require("node:path");

const util = require("node:util");
const { exec } = require('child_process');
const { spawn } = require('child_process');
const execAsync = util.promisify(exec);

module.exports = class Integrations {

    #haproxySSLFolder;
  
    constructor(CONTEXT) {

        this.#haproxySSLFolder = process.env.F_haproxySSL;
    }

    
    async #fileExists(path) {
        try {
          await fsp.stat(path);
          return true;
        } catch (e) {
          return false;
        }
      }
    


    async checkCert(pem){

        var config = {
            expires: null,
            expired: true,
            domains: []
        }
       
        // Check cert expiry
        var result = await execAsync(`echo "${pem}" | openssl x509 -noout -enddate | cut -d= -f2`);            
        if(result.stderr && result.stderr.trim()!==""){
            throw new Error(result.stderr);                              
        }
        config.expires = new Date(result.stdout);              
        if(config.expires.getTime() > (new Date()).getTime()) config.expired = false;

         
        const domains = [];
        var result = await execAsync(`echo "${pem}" | openssl x509 -noout -subject -ext subjectAltName`);

        if(result.stderr && result.stderr.trim()!==""){
            throw new Error(result.stderr);                              
        }

        var output = result.stdout;
        // Extract CN
        const cnMatch = output.match(/subject=\s*CN\s*=\s*([^,\n]+)/);
        if (cnMatch) domains.push(cnMatch[1].trim());
        // Extract SANs
        const sanMatch = output.match(/X509v3 Subject Alternative Name:([\s\S]*?)(\n\n|\r\r|$)/);
        if (sanMatch) {
            const sanString = sanMatch[1];
            const dnsEntries = sanString.match(/DNS:([^,\n]+)/g);
            if (dnsEntries) {
                dnsEntries.forEach(dns => {
                    const domain = dns.replace(/^DNS:/, '').trim();
                    if (!domains.includes(domain)) domains.push(domain);
                });
            }
        }
        config.domains = domains;   
          
        return config;
    }
       
    async addCert(payload){

        var pemFileName = payload.name;

        try{
            var certInfo = await this.checkCert(payload.pem);
        }catch(e){
            log.error("Haproxy",e);
            return {error: "Not a valid .pem. See backend logs for more info."}
        }
       
        if(certInfo.expired === true || certInfo.domains.length === 0) {
            log.error("Haproxy", certInfo, "Certificate is invalid!");            
            return certInfo;
        }
        
        // write to haproxy/ssl directory   
        await fsp.writeFile(this.#haproxySSLFolder+`/${pemFileName}`, payload.pem);            

        // Test config and reload....
        if(await this.#testConfig() === true) await this.#reload();       

        return certInfo;
    }

    async deleteCert(payload){

        var pemFileName = payload.name;
        var fileExists = await this.#fileExists(this.#haproxySSLFolder+`/${pemFileName}`);
        if(!fileExists){            
            return  {msg: "No such file. No reload of haproxy"};
        }
        await fsp.unlink(this.#haproxySSLFolder+`/${pemFileName}`);

        // Test config and reload....
        if(await this.#testConfig() === true) var reloadResult = await this.#reload();       
        return  {msg: "deleted file and reloaded haproxy", reloadResult: reloadResult};
    }

    
    async #testConfig(){

        try{
            var cmd = `docker exec cc-haproxy haproxy -f /etc/haproxy/conf.d -c && echo "pass" || echo "fail"`;
            var result = await execAsync(cmd);
            if(result.stdout.trim() === "pass") return true;
            else return false;

        }catch(e){
            log.error("Haproxy", e);            
        }

    }

    async #reload(){

        log.info("Haproxy", "Reload haproxy");
         try{
            var cmd = `docker exec cc-haproxy haproxy -f /etc/haproxy/conf.d -c && docker kill -s HUP cc-haproxy || echo "NO RELOAD"`;
            var result = await execAsync(cmd);
            return result;           
            
        }catch(e){
            log.error("Haproxy", e);
        }
    }


 


}