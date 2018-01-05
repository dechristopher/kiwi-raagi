// kiwi/raagi - Created January 2nd, 2018

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const https = require('https');
const rcon = require('srcds-rcon');
const fs = require('fs');

// Custom modules
const ascii = require('./modules/ascii.js');
const log = require('./modules/log.js');

// Build configuration
const conf = JSON.parse(fs.readFileSync('./config.json'));
const version = require('./package').version;

// Inject bodyParser middleware to get request body
//app.use(bodyParser.json()); // to support JSON-encoded bodies (currently disabled)
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// Ensure all requests contain the auth token header:
// KIWI-Raagi-Auth-Token
app.use(function(req, res, next) {
    if (req.header("KIWI-Raagi-Auth-Token") !== conf.authtoken) {
        log("Auth failed: " + req.ip, undefined, true);
        res.sendStatus(404);
        res.end();
        return;
    }
    next();
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
//	- sid: server index from config.json [req.body.sid]
//	- command: command to run on remote server [req.body.command]
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
});

// SSL Mode Logic
if (conf.ssl.enabled) {
    // Configure SSL
    var options = {
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