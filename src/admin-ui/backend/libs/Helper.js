const crypto = require('node:crypto')
const randomUUID = crypto.randomUUID;


exports.hasRole = (req, role) => {   
    if(req.user?.APP_ROLES?.indexOf(role) !== -1) return true;
    else return false;
}

exports.createPasswordHash = function (string) {
    var shasum = crypto.createHash('sha256')
    shasum.update(string);
    var pwd = shasum.digest('hex');
    return pwd;
}


const emailRegex = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/;
exports.isEmailValid = function(email) {
  if (!email || email.length > 254) return false;
  if (!emailRegex.test(email)) return false;
  const parts = email.split("@");
  if (parts[0].length > 64) return false;
  const domainParts = parts[1].split(".");
  if (domainParts.some(part => part.length > 63)) return false;
  return true;
}


exports.setVar = function (object, namespace, value, options) {

    options = options || {};
    var pathSeparator = options.pathSeparator || '.';
    if (Array.isArray(namespace)) {
        namespace = namespace.join(pathSeparator);
    }
    // Recursive creation of namespace path
    function createObject(obj, path, value) {
        var names = path.split(pathSeparator);
        // Create namespace if not existent
        var part = names[0];
        if (obj[part] == undefined) obj[part] = {};
        names = names.splice(1);

        // Is there more?
        if (names.length > 0) {
            createObject(obj[part], names.join(pathSeparator), value);
        } else {
            obj[part] = value;
        }
    }
    // Start the recursive function
    createObject(object, namespace, value);
}

/**
   * Get the value of a "namespace"" via dot-notation
   *
   * @Example
   * this.CORE.Helper.getVar(object, "core.User", {});
   * this.CORE.Helper.getVar(req, "scinario.liveConfig.core_Users.validations",{})
   *
   * @param
   * @param
   * @param {object} defaultValue Default-Value if there is no value found
   *
   */
exports.getVar = function (object, namespace, defaultValue, ignoreOverwriting, options) {

    options = options || {};
    var pathSeparator = options.pathSeparator || '.';


    if (object == undefined) object = {};

    // Request object
    if (ignoreOverwriting !== true && object.scinario !== undefined) {
        // check if there is an OVERWRITE field for the wanted value
        // e.g. there are dynamic values for a request to collaboration_Sheets etc.
        var overwrite = this.getVar(object.scinario.overwritings, namespace, undefined, true);
        if (overwrite !== undefined) {
            // console.info("fetched overwrite configuration for ", namespace, overwrite);
            return overwrite;
        }
    }
    if (typeof namespace === 'string') {
        var names = namespace.split(pathSeparator);
    } else {
        var names = namespace;
    }
    var value = object;
    try {
        for (var x in names) {            
            if (value[names[x]] !== undefined) {
                value = value[names[x]];
            } else {
                if (defaultValue !== undefined) {
                    return defaultValue;
                } else {
                    return undefined;
                }
            }
        }
    } catch (e) {
        if (defaultValue !== undefined) {
            return defaultValue;
        } else {
            return undefined;
        }
    }
    return value;
};


exports.ip2int = function(ip){
    return ip.split('.').reduce(function(ipInt, octet) { return (ipInt<<8) + parseInt(octet, 10)}, 0) >>> 0;
}


exports.prepareTemplate = function(string, parameters, debug) {

    // Replace all parameters in the string
    for (var x in parameters) {
        string = string.replaceAll(`{{${x}}}`, parameters[x]);
    }

    // Left over???    
    const regexp = /{{([^\s]+)}}/g;
    const array = [...string.matchAll(regexp)];
    for (var x in array) {
        var paramName = array[x][1];
        if(debug) console.log(`No parameter in config for '${paramName}' (${array[x][0]}) -> replaced by EMPTY STRING!`);
        // replace with empty string!!
        string = string.replaceAll(`{{${paramName}}}`, '');
    }

    return string;
}


exports.generateVar = function(options = {}){

    if(options.uuid) return randomUUID();        
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const specials = (options.specialChars !== undefined && typeof options.specialChars === "string") ? options.specialChars: "!@#$%^&*()_-+=[]{};:,.<>?";
    const allChars = chars + specials;
    let password = "";
    
    var length = options.length || 15;        
    
    for (let i = 0; i < length; i++) {
        const randIndex = Math.floor(Math.random() * allChars.length);
        password += allChars[randIndex];
    }

    return password;
}
