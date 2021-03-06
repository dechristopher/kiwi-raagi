// kiwi/raagi - Created January 2nd, 2018

/*
GOODLUCK
TRIFORCE
   ▲
 ▲  ▲
PRAY FOR
NO CRASH
*/

// NPM modules
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const https = require('https');
const request = require('request');
const timeout = require('express-timeout-handler');
const rcon = require('srcds-rcon');
const fs = require('fs');
const os = require('os');

// Custom modules
const ascii = require('./modules/ascii.js');
const log = require('./modules/log.js');

// Build configuration
const conf = JSON.parse(fs.readFileSync('./config.json'));
const version = require('./package').version;

// Static strings
const strServiceInit = `Init kiwi/raagi | v${version} | *:${conf.port} | SSL: ${conf.ssl.enabled}`;
const strServiceUp = `Service up. Listening on *:${conf.port}`;
const strServiceUnavailable = `Service unavailable. Please retry later. If this error persists, contact an engineer.`;
const strForceShutdown = `Could not close connections in time, forcefully shutting down!`;
const strInitShutdown = `Init service shutdown`;

// HTTP server variable
let srv;

// Set up timeout middleware options
var timeoutOptions = {
    timeout: conf.timeout,
    onTimeout: function(req, res) {
        req.timedout = true;
        res.status(503).send(strServiceUnavailable);
    },
    onDelayedResponse: function(req, method, args, requestTime) {
        console.log(`Attempted to call ${method} after timeout`);
    },
    disable: ['write', 'setHeaders', 'send', 'json', 'end']
};

// Ensure requests time out after 2 seconds
app.use(timeout.handler(timeoutOptions));

// Inject bodyParser middleware to get request body
app.use(bodyParser.json()); // to support JSON-encoded bodies (currently disabled)
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// Ensure all requests contain the auth token header:
// KIWI-Raagi-Auth-Token
// Response Code: (401 Unauthorized)
app.use(function(req, res, next) {
    if (req.header('KIWI-Raagi-Auth-Token') !== conf.authToken) {
        log(`Auth failed: ${req.ip}`);
        res.sendStatus(401);
        res.end();
        return;
    }
    next();
});

// SID Checker middleware to not break the handlers
// Response Code: (400 Bad Request)
// Response Body: {"error": "invalid sid - x"}
app.use(function(req, res, next) {
    if (req.body.sid === undefined && req.params.sid === undefined) {
        // both param and body are undefined
        next();
    } else {
        //parse sid
        let sid = -1;
        if (req.body.sid !== undefined) {
            sid = Number(req.body.sid);
        } else {
            sid = Number(req.params.sid);
        }
        // run check
        if (sid > -1 && sid < conf.servers.length) {
            next();
        } else {
            log(`Bad request: ${req.ip} -> invalid sid [${sid}]`);
            res.setHeader('Content-Type', 'application/json');
            res.sendStatus(400);
            res.send(`{"error":"invalid sid - ${sid}"}`);
            res.end();
            return;
        }
    }
});

// SID Checker middleware to not break the handlers
// Response Code: (400 Bad Request)
// Response Body: {"error": "invalid sid - x"}
app.use('/status/:sid', function(req, res, next) {
    if (req.body.sid === undefined && req.params.sid === undefined) {
        // both param and body are undefined
        next();
    } else {
        //parse sid
        let sid = -1;
        if (req.body.sid !== undefined) {
            sid = Number(req.body.sid);
        } else {
            sid = Number(req.params.sid);
        }
        // run check
        if (sid > -1 && sid < conf.servers.length) {
            next();
        } else {
            llog(`Bad request: ${req.ip} -> invalid sid [${sid}]`);
            res.setHeader('Content-Type', 'application/json');
            res.sendStatus(400);
            res.send(`{"error":"invalid sid - ${sid}"}`);
            res.end();
            return;
        }
    }
});

// Respond with service version and some of the configuration in format:
// Response Format (JSON) : {"status": "online", "version":"...", "port": xxxx, "timeout": xxxx, "ssl.enabled": true/false}
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(`{"status": "online", version":"${version}", "port": ${conf.port}, "timeout": ${conf.timeout}, "ssl.enabled": ${conf.ssl.enabled}}`);
    log(`[GET /] ( ${req.ip} )`);
});

// Respond with calculated latency to server in ms
// Response Code (400) if time not provided or in future
// Response Format (JSON) : {"latency":"X"}
app.post('/latency', (req, res) => {
    // Ensure client sends time
    if (req.body.time === undefined) {
        log(`[POST /latency] Bad request: ( ${req.ip} ) -> time not provided`);
        res.setHeader('Content-Type', 'application/json');
        res.sendStatus(400);
        res.send(`{"error":"time not provided"`);
        res.end();
        return;
    }
    //console.log("Req time: " + req.body.time);
    // Calculate latency
    let clientTime = Number(req.body.time);
    //console.log("Client time: " + clientTime);
    //let time = new Date();
    let serverTime = (new Date()).getTime();
    //console.log("Server time: " + serverTime);
    let latency = serverTime - clientTime;
    //console.log("Latency: " + latency);
    // Ensure client is not in the future
    if (latency < 0) {
        log(`[POST /latency] Bad request: ( ${req.ip} ) -> invalid client time (future?)`);
        res.setHeader('Content-Type', 'application/json');
        res.sendStatus(400);
        res.send(`{"error":"invalid time (future?)"`);
        res.end();
        return;
    }
    // Send normal response
    res.setHeader('Content-Type', 'application/json');
    res.send(`{"latency":"${latency}"}`);
    log(`[POST /latency] ( ${req.ip} ) -> Latency: ${latency}ms`);
});

// Send command to server and reply with rcon command response:
// Request Parameters:
//	- sid (Body): server index from config.json [req.body.sid]
//	- command (Body): command to run on remote server [req.body.command]
// Response Code: (503) if server connection times out or is unreachable
// Response Format (JSON) : {"command":"...", "output":"..."}
app.post('/', (req, res) => {
    let conn = rcon({
        address: conf.servers[req.body.sid].ip,
        password: conf.servers[req.body.sid].pw
    });
    conn.connect().then(() => {
        return conn.command(req.body.command).then((status) => {
            if (req.timedout) {
                //console.log('TIMED OUT');
                con.disconnect();
                return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(`{"command":"${req.body.command}", "output":"${status}"}`);
            log(`[POST /] ( ${req.ip} ) -> [S: '${conf.servers[req.body.sid].id}'] [CMD: '${req.body.command}']`);
        });
    }).then(() => {
        conn.disconnect();
        //console.log('DC');
    }).catch((err) => {
        console.log(`CAUGHT ERROR (RCON): ${err}`);
    });
});

// Get current server status
// Request Parameters:
//	- sid (URL Param): server indexfrom config.json [req.params.sid]
// Response Code: (503) if server connection times out or is unreachable
// Response Format (JSON): {"sid": "...", "online": true, "players": x, "bots": x}
app.get('/status/:sid', (req, res) => {
    // Build request options
    let options = {
        url: `${conf.ssl.prefix}://localhost:${conf.port}/`,
        method: 'POST',
        headers: {
            'KIWI-Raagi-Auth-Token': conf.authToken
        },
        form: {
            sid: req.params.sid,
            command: 'status'
        },
        agentOptions: {
            rejectUnauthorized: false
        }
    };
    // Declare response object
    let respObject = {};
    // Hit self to get server status
    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            // Build information
            let humanSplit = body.split('humans')[0].split(' ');
            let humans = humanSplit[humanSplit.length - 2];
            let botSplit = body.split('bots')[0].split(' ');
            let bots = botSplit[botSplit.length - 2];
            // Set response data
            respObject.sid = req.params.sid;
            respObject.online = true;
            respObject.players = Number(humans);
            respObject.bots = Number(bots);
            // Send response
            log(`[POST /pop/${req.params.sid}] ( ${req.ip} ) -> [S: '${conf.servers[req.params.sid].id}'] [Population: '${humans}']`);
            res.setHeader('Content-Type', 'application/json');
            res.send(respObject);
        } else {
            // Set response data
            respObject.sid = req.params.sid;
            respObject.online = false;
            respObject.players = 0;
            respObject.bots = 0;
            // Send error response
            log(`[POST /pop/${req.params.sid}] ( ${req.ip} ) -> [S: '${conf.servers[req.params.sid].id}'] ERROR: '${error}'`);
            res.setHeader('Content-Type', 'application/json');
            res.sendStatus(503);
            res.send(respObject);
        }
    });
});

// Initiate service shutdown
// Response Format (JSON): {"status": "shutdown"}
app.post('/shutdown', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(`{"status": "shutdown"}`);
    // Initiate shutdown procedures
    log(`[POST /shutdown] ( ${req.ip} )`).then(() => {
        terminate();
    });
});

// SSL Mode Logic
if (conf.ssl.enabled) {
    // Set HTTP prefix
    conf.ssl.prefix = "https";
    // Configure SSL
    let options = {
        key: fs.readFileSync(conf.ssl.pKeyFile),
        cert: fs.readFileSync(conf.ssl.certFile)
    };
    // Listen for requests
    srv = https.createServer(options, app).listen(conf.port, () => { /* Do stuff... */ log(strServiceUp); });
    srv.timeout = conf.timeout;
} else {
    // Set HTTP prefix
    conf.ssl.prefix = "http";
    //No SSL
    srv = app.listen(conf.port, () => { /* Do stuff... */ log(strServiceUp); });
    srv.
    srv.timeout = conf.timeout;
}

// Initiate shutdown procedures
function terminate() {
    // Hard quit if service cannot gracefully shutdown after 10 seconds
    setTimeout(function() {
        log(strForceShutdown).then(() => {
            log(`${os.EOL}~${os.EOL}${os.EOL}`, { stdOut: false, usePrefix: false }).then(() => {
                // Terminate with exit code 1
                process.exit(1);
            });
        });
    }, 10 * 1000);
    // Attempt a graceful shutdown on SIGTERM
    srv.close(function() {
        log(strInitShutdown).then(() => {
            log(`${os.EOL}~${os.EOL}${os.EOL}`, { stdOut: false }).then(() => {
                // Close db, rcon connections, and etc...
                // Terminate with exit code 0
                process.exit(0);
            });
        });
    });
}

// Catch the termination signal and operate on it
process.on('SIGTERM', function() {
    terminate();
});

// Catch the interrupt signal and operate on it
process.on('SIGINT', function() {
    terminate();
});

ascii(); // Print ascii and startup information
log(strServiceInit);