/***
 * Source: https://github.com/sindresorhus/p-throttle
 * 
 */
class AbortError extends Error {
	constructor() {
		super('Throttled function aborted');
		this.name = 'AbortError';
	}
}

const EventEmitter = require('events');

class pThrottle extends EventEmitter {

    // throttle configuration
	#id;
    #limit;
    #interval;
    #type;
    #queue;
    #maxQueueSize;
    #currentTick;
    #activeCount;
    #strictTicks;
    #getDelay;

    constructor({id, limit, interval, maxQueueSize, type}){
        super();         

		this.#id = id;
		if(id === undefined){
			throw new TypeError("Throttle needs an id!");
		}		
        this.#limit = limit;
    	if (!Number.isFinite(limit)) {
	    	throw new TypeError('Expected `limit` to be a finite number');
	    }
        this.#interval = interval;
    	if (!Number.isFinite(interval)) {
	    	throw new TypeError('Expected `interval` to be a finite number');
	    }
      
        this.#maxQueueSize = (maxQueueSize !== undefined) ? maxQueueSize : 1000;
    	if (!Number.isFinite(this.#maxQueueSize)) {
	    	throw new TypeError('Expected `maxQueueSize` to be a finite number');
	    }

        this.#type = type; 
        if(["windowed","strict","hard"].indexOf(this.#type)===-1) throw new Error(`Please define a throttle type: windowed,strict or hard (not '${type}')`);

        this.#getDelay = null;
        if(this.#type === "strict") this.#getDelay = this.#strictDelay;
        else if(this.#type === "windowed") this.#getDelay = this.#windowedDelay;
        else if( this.#type === "hard") this.#getDelay = this.#hardLimit;
    
        // default
        this.#queue = new Map();
        this.#currentTick = 0;
	    this.#activeCount = 0;
        this.#strictTicks = [];
    }


	getOptions(){

		return {
			id: this.#id,
			limit: this.#limit,
			interval: this.#interval,
			maxQueueSize: this.#maxQueueSize, 
			type: this.#type
		}
	}

    // Hard limit: do not delay anything until limit is reached...
    // then throttle!
    #hardLimit() {
		
        const now = Date.now();
        let throttle = false;

		if ((now - this.#currentTick) > this.#interval) {
			this.#activeCount = 1;
			this.#currentTick = now;
			return {delay: 0, throttle: throttle};
		}
		if (this.#activeCount < this.#limit) {
			this.#activeCount++;
		} else {
            // throw event for reaching "throttle"
            this.emit("throttled")			
            throttle = true;
			this.#currentTick += this.#interval;
			this.#activeCount = 1;
		}
		return {delay: this.#currentTick - now, throttle: throttle};
	}

    #windowedDelay() {
	
        const now = Date.now();

		if ((now - this.#currentTick) > this.#interval) {
			this.#activeCount = 1;
			this.#currentTick = now;
			return {delay: 0};
		}

		if (this.#activeCount < this.#limit) {
			this.#activeCount++;
		} else {     
            this.emit("throttled")			
			this.#currentTick += this.#interval;
			this.#activeCount = 1;
		}
		return {delay: this.#currentTick - now};
	}

    #strictDelay() {

		const now = Date.now();

		if (this.#strictTicks.length < this.#limit) {
			this.#strictTicks.push(now);
			return {delay:0};
		}
		const earliestTime = this.#strictTicks.shift() + this.#interval;
		if (now >= earliestTime) {
			this.#strictTicks.push(now);
			return {delay: 0};
		}
        this.emit("throttled")		
		this.#strictTicks.push(earliestTime);
		return {delay: earliestTime - now};

	}
    
    async throttle(){

        // Compute delay AND if we need to throttle (hard)			
        var { delay, throttle } = this.#getDelay();
        // If limit is NOT reached yet, just call the function directly
        // no windowed delay since it costs performance!
        if(this.#type === "hard" && throttle === false || delay <= 0) return;

		// check queue size
        if(this.#queue.size > this.#maxQueueSize) {
            this.emit("ExceedMaxQueueSize");			
            throw new Error("QueueSizeFull");
        }
        // we need to throttle...so return a delayed promise :)
        return new Promise((resolve, reject) => {
            const execute = () => {
                resolve();
                this.#queue.delete(timeout);               
			}
			
            let timeout = setTimeout(execute, delay);           
            this.#queue.set(timeout, reject);            
        });

    }


	// 	throttled.abort = () => {
	// 		for (const timeout of queue.keys()) {
	// 			clearTimeout(timeout);
	// 			queue.get(timeout)(new AbortError());
	// 		}
	// 		queue.clear();
	// 		strictTicks.splice(0, strictTicks.length);
	// 	};
	// 	throttled.isEnabled = true;
	// 	Object.defineProperty(throttled, 'queueSize', {
	// 		get() {
	// 			return queue.size;
	// 		},
	// 	});
	// 	return throttled;
	// };
}

// Export it
module.exports = {
    pThrottle: pThrottle,
    AbortError: AbortError
}



// EXAMPLE 
// const now = Date.now();
// const throttle = pThrottle({
//     limit: 2,
//     interval: 1000
// });
// const throttled = throttle(async index => {
//     const secDiff = ((Date.now() - now) / 1000).toFixed();
//     return `${index}: ${secDiff}s`;
// });
// for (let index = 1; index <= 6; index++) {
//     (async () => {
//         console.log(await throttled(index));
//     })();
// }
