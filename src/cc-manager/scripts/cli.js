const { exec } = require('node:child_process');
const util = require('node:util');
const execAsync = util.promisify(exec);
const readline = require('node:readline');
const { spawn } = require('node:child_process');


async function request(question) {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`${question} (y/n) `, (answer) => {
            answer = answer.toLowerCase();
            if (answer === 'y' || answer === 'yes') {
                resolve(true);
                // Add the code to continue here
            } else {
                resolve(false)
            }
            rl.close();
        });
    })
}


// first argument i node, second is cli.js...then yeha!
process.argv.shift();
process.argv.shift();




var COM = {};

// Add commands

// Version
COM.version = {
    'help': `Print out version`,
    'fn': async function () {
        try {
            var package = require("./../package.json");
            console.log(`CloudCompose Free v${package.version}`);
        } catch (e) {
            console.log(e);
        }
    }
}

// Load balancer (reload)
COM["lb-reload"] = {
    'help': `- lb-reload\tReload HAProxy`,
    'fn': async function () {
        console.log("➡️  Try to reload HAProxy")
        var result = await execAsync(`docker exec cc-haproxy haproxy -f /etc/haproxy/conf.d -c && docker kill -s HUP cc-haproxy || echo "NO RELOAD"`);
        if (result.stderr === "") console.log("✅ HAProxy reloaded")
        else console.log(`❌ HAProxy was not reloaded: ${result.stderr}`)
    }
}
// Load balancer (test)
COM["lb-test"] = {
    'help': `- lb-test\tTest config of HAProxy`,
    'fn': async function () {
        console.log("➡️  Test HAProxy configuration")
        var result = await execAsync(`docker exec cc-haproxy haproxy -f /etc/haproxy/conf.d -c && echo "Haproxy config is valid" || echo "HAProxy config is not valid"`);
        if (result.stderr === "") console.log("✅ HAProxy configuration is good.")
        else console.log(`❌ HAProxy configuration has errors: ${result.stderr}`)
    }
}

COM["refreshDB"] = {
    'help': `- refreshDB\tRefresh the DB schema structure of a tenant db`,
    'fn': async function () {

        let tenantId = process.argv[0] || "";
        if (tenantId.trim() === "") return console.log("Please provide tenant id (like './cli.sh refreshDB cc')")

        try {
            var package = require("./../package.json");
            console.log(`CloudCompose Free v${package.version}`);

            require("/cc/admin-ui/src/backend/libs/Logging")("info");
            // check for file
            const db = await require("/cc/admin-ui/src/backend/libs/data/Database")({ dbName: `tenant-${tenantId}.db`, create: false });
            var settings = await db.tables("settings").fetch({}, { key: "version" });
            // Database version                
            // var settings = await db.tables("settings").upsert({}, {key:"version", value: package.version});
            await db.refreshDatabaseStructure();

            process.exit();

        } catch (e) {
            console.log(e);
        }

    }
}


COM["restart"] = {
    'help': `- restart\tRestart the cloud compose runtime container`,
    'fn': async function () {
        console.log("➡️  Restart containers")
        var result = await execAsync(`docker restart cc-admin-ui cc-manager cc-haproxy`);

    }
}

COM["stop"] = {
    'help': `- stop\t\tStop the cloud compose runtime container (no CLI after that!)`,
    'fn': async function () {

        var result = await request("Are you sure to stop cloud compose containers?");
        if (result === false) {
            console.log(`❌ Stop canceled`)
            process.exit();
        }
        console.log("➡️  Stop containers")
        var result = await execAsync(`docker stop cc-admin-ui cc-manager cc-haproxy`);

    }
}




COM["uninstall"] = {
    'help': `- uninstall\tUninstall cloud compose (removes all containers and all data)`,
    'fn': async function () {

        var result = await request("Are you sure to uninstall and delete ALL data?");
        if (result === false) {
            console.log(`❌ Uninstall canceled`)
            process.exit();
        }

        console.log("➡️  Check for existing app containers ...")
        //List container IDs with label "cloud"
        var result = await execAsync(`docker ps -a -q --filter "label=cloudcompose_group"`);
        var containerIds = result.stdout.trim().split("\n").filter((id) => {
            if (id.trim() === "") return false;
            else return true;
        });
        if (containerIds.length > 0) {
            var result = await execAsync(`docker rm -f ${result.stdout.split("\n").join(" ")}`);
            if (result.stderr === "") console.log(`✅ Deleted ${containerIds.length} containers`)
            else console.log(`❌ Could not delete containers: ${result.stderr}`)
        } else {
            console.log(`✅ No containers to deleted`)
        }

        console.log("➡️  Delete all data content")
        var result = await execAsync(`rm -rf /data/*`);
        console.log(`✅ All data was deleted`)

        console.log("➡️  Stop and delete cloud compose runtime container")
        var result = await execAsync(`docker stop cc-admin-ui cc-haproxy cc-manager`);


    }
}


async function main() {


    var exitAfter = true;

    // check for command
    var command = process.argv.shift();

    if (COM[command]) {

        if(COM[command].exitAfter === false) exitAfter = false;
        await COM[command].fn();
    } else {
        console.log("== 📦 Cloud Compose Free ==");
        if(command !== "help") console.log('\x1b[31m%s\x1b[0m', `No command: ${command}`)
        console.log('\x1b[31m%s\x1b[0m', "Use like ./cli.sh <command> with one of the following commands")
        for (var x in COM) {
            console.log(COM[x].help);
        }
        console.log("");
    }


    if(exitAfter === true) process.exit();

}

main();