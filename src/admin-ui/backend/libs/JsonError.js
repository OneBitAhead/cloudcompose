class JsonError extends Error {
  constructor(message, jsonData = {}) {
    super(message);
    // Set the error name to the class name
    this.name = this.constructor.name;
    // Add your custom JSON data property
    if(jsonData && jsonData.message){
        log.error("App", "'message' is a reserved word in JsonError and removed from json payload!")
        delete jsonData.message;
    }
    this.data = jsonData;
    // Capture stack trace (V8 engines like Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toString(){
    return JSON.stringify(this.toJSON());
  }

  toJSON() {
    return {
      message: this.message,
      ...this.data,
    };
  }

}
globalThis.JsonError = JsonError;
