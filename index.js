// kiwi/raagi - Created January 2nd, 2018

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const https = require('https');
const request = require('request');
const rcon = require('srcds-rcon');
const fs = require('fs');

// Custom modules
const ascii = require('./modules/ascii.js');
const log = require('./modules/log.js');

// Build configuration
const conf = JSON.parse(fs.readFileSync('./config.json'));
const version = require('./package').version;

// Set http prefix
if (conf.ssl.enabled) {
    conf.ssl.prefix = "https";
} else {
    conf.ssl.prefix = "http";
}

// Inject bodyParser middleware to get request body
//app.use(bodyParser.json()); // to support JSON-encoded bodies (currently disabled)
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// Ensure all requests contain the auth token header:
// KIWI-Raagi-Auth-Token
// Response Code: (401 Unauthorized)
app.use(function(req, res, next) {
    if (req.header("KIWI-Raagi-Auth-Token") !== conf.authtoken) {
        log("Auth failed: " + req.ip, undefined, true);
        res.sendStatus(401);
        res.end();
        return;
    }
    next();
});

// SID Checker middleware to not break the handlers
// Response Code: (400 Bad Request)
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
            log('Bad request: ' + req.ip + ' -> invalid sid [' + sid + ']', undefined, true);
            res.sendStatus(400);
            res.end();
            return;
        }
    }
});

// SID Checker middleware to not break the handlers
// Response Code: (400 Bad Request)
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
            log('Bad request: ' + req.ip + ' -> invalid sid [' + sid + ']', undefined, true);
            res.sendStatus(400);
            res.end();
            return;
        }
    }
});

// Respond with service version in format:
// Response Format (JSON) : {"version":"..."}
app.get('/', (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(`{"version":"` + conf.version + `"}`);
    log('[GET /] (' + req.ip + ')', undefined, true);
});

// Send command to server and reply with rcon command response:
// Request Parameters:
//	- sid (Body): server index from config.json [req.body.sid]
//	- command (Body): command to run on remote server [req.body.command]
// Response Format (JSON) : {"command":"...", "output":"..."}
app.post('/', (req, res) => {
    let conn = rcon({
        address: conf.servers[req.body.sid].ip,
        password: conf.servers[req.body.sid].pw
    });
    conn.connect().then(() => {
        return conn.command(req.body.command).then((status) => {
            res.setHeader("Content-Type", "application/json");
            res.send(`{"command":"` + req.body.command + `", "output":"${status}"}`);
            log('[POST /] (' + req.ip + ") -> [S: '" + conf.servers[req.body.sid].id + "'] [CMD: '" + req.body.command + "']", undefined, true);
        });
    }).then(() => conn.disconnect());

    //TODO (POST /): Build in error handling
});

// Get current server status
// Request Parameters:
//	- sid (URL Param): server indexfrom config.json [req.params.sid]
// Response Format (JSON): {"sid": "...", "online": true, "players": x, "bots": x}
app.get('/status/:sid', (req, res) => {
    // Build request options
    let options = {
        url: conf.ssl.prefix + '://localhost:' + conf.port + '/',
        method: 'POST',
        headers: {
            'KIWI-Raagi-Auth-Token': conf.authtoken
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
            let humanSplit = body.split("humans")[0].split(" ");
            let humans = humanSplit[humanSplit.length - 2];
            let botSplit = body.split("bots")[0].split(" ");
            let bots = botSplit[botSplit.length - 2];
            // Set response data
            respObject.sid = req.params.sid;
            respObject.online = true;
            respObject.players = Number(humans);
            respObject.bots = Number(bots);
            // Send response
            log('[POST /pop/' + req.params.sid + '] (' + req.ip + ") -> [S: '" + conf.servers[req.params.sid].id + "'] [Population: '" + humans + "']", undefined, true);
            res.setHeader('Content-Type', 'application/json');
            res.send(respObject);
        } else {
            // Set response data
            respObject.sid = req.params.sid;
            respObject.online = false;
            respObject.players = 0;
            respObject.bots = 0;
            // Send error response
            log('[POST /pop/' + req.params.sid + '] (' + req.ip + ") -> [S: '" + conf.servers[req.params.sid].id + "'] ERROR: " + error, undefined, true);
            res.setHeader('Content-Type', 'application/json');
            res.sendStatus(503);
            res.send(respObject);
        }
    });
});

// SSL Mode Logic
if (conf.ssl.enabled) {
    // Configure SSL
    let options = {
        key: fs.readFileSync(conf.ssl.pkeyfile),
        cert: fs.readFileSync(conf.ssl.certfile)
    };
    // Listen for requests
    https.createServer(options, app).listen(conf.port);
} else {
    //No SSL
    app.listen(conf.port, () => { /* Do stuff... */ });
}

ascii(); // Print ascii and startup information
log('Init kiwi/raagi | v' + version + " | *:" + conf.port + " | SSL: " + conf.ssl.enabled, undefined, true);