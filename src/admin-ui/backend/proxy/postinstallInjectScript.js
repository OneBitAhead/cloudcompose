window.cloudComposeDebug = false;

function cloudcomposeDebug(debug){
    window.cloudComposeDebug = !!debug;
    if(debug === true) console.log("=== CLOUD COMPOSE POST INSTALL INJECT SCRIPT ===");

}

async function waitFor(parent, selector, attempts = 10, delay = 500) {
    
    try{
        if (parent == null) throw new Error('Parent not present');
        var node = parent.querySelector(selector);
        if (node !== null) { return new Promise((resolve, reject) => { resolve(node); }); }
        return new Promise((resolve, reject) => {
            var counter = attempts || 10;
            var interval = window.setInterval(function () {
                // Too many attempts
                if (counter < 0) {
                    clearInterval(interval);
                    reject();
                    return;
                }
                var node = null;
                try {
                    node = parent.querySelector(selector);
                } catch (e) {
                    reject(e);
                }
                if (node !== null) {
                    // Clear interval 
                    clearInterval(interval);
                    resolve(node);
                    return;
                }
                // Increase timeout counter
                counter = counter - 1;
            }, delay || 500);
        })
    }catch(e){
        if(window.cloudComposeDebug) console.error("CloudComposeDebug:", e);    
    }
}


async function emulateTyping(selector, value, debug = false) {

    try{

        const input = await waitFor(document.body, selector);
        // empty it!
        try{
            input.value = '';
        }catch(e){

        }

        input.focus();

        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            const keyCode = char.toUpperCase().charCodeAt(0);

            // keydown event
            const keydownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                charCode: 0,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keydownEvent);

            // keypress event
            const keypressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                charCode: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keypressEvent);

            // update the input's value as React expects
            const valueBefore = input.value;
            input.value = valueBefore + char;

            // input event to inform React/DOM of the change
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(inputEvent);

            // keyup event
            const keyupEvent = new KeyboardEvent('keyup', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                charCode: 0,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keyupEvent);
        }
    }catch(e){
        if(window.cloudComposeDebug) console.error("CloudComposeDebug:", e);        
    }
}


async function click(selector) {
    try{

        const button = await waitFor(document.body, selector);                
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            button: 0
        });
        button.dispatchEvent(clickEvent);
    }catch(e){
       if(window.cloudComposeDebug) console.error("CloudComposeDebug:", e);    
    }
}

async function sleep(ms) {
    return new Promise((resolve) => { setTimeout(() => { resolve() }, ms) });
}





function installStatus(status){
  if(window.parent) window.parent.postMessage({status: status},"*");
}
function installDone(sleepMS = 1000){
    if(window.parent) window.parent.postMessage({status: "done", sleepMS: sleepMS},"*");
}
