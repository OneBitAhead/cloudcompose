const pino = require("pino");

class Log {
    #baseLogger;
    #loggers;
    constructor(level){
        // Create a base logger instance
        this.#baseLogger = pino({
            level: level || 'info',
            // optionally configure pretty printing, serializers, etc.
            transport: {
                target: 'pino-pretty',                
                options: { colorize: true }
            }
        });
        this.#loggers = {};
        // Dynamically create logging methods for all pino levels
        const levels = Object.keys(pino.levels.values); // ['fatal','error','warn','info','debug','trace']        
        levels.forEach(level => {
            this[level] = (loggerName, ...message) => {
                const log = this.#getLogger(loggerName);
                log[level](...message);
            };
        });
    }
    #getLogger(logger){
        if(!this.#loggers[logger]) this.#loggers[logger] = this.#baseLogger.child({name: logger});
        return this.#loggers[logger];      
    }

    globalLevel(level){
        this.#baseLogger.level = level;
    }
    getLevel(logger, level){
        const log = this.#getLogger(logger);
        return log.level;        
    }
    setLevel(logger, level){
        const log = this.#getLogger(logger);
        log.level = level;
    }   
};

module.exports = (level)=>{
    globalThis.log = new Log(level);
}
