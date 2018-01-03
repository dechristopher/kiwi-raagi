// kiwi/raagi - Created January 2nd, 2018

const express = require('express');
var bodyParser = require('body-parser');
const app = express();
const https = require('https');
const rcon = require('srcds-rcon');
const fs = require('fs');

// Build configuration
const conf = JSON.parse(fs.readFileSync('./config.json'));

// Configure SSL
var options = {
    key: fs.readFileSync('./private.key'),
    cert: fs.readFileSync('./ssl.crt')
};

// Inject bodyParser middleware to get request body
//app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// Respond with service version in format:
// {"version":"..."}
app.get('/', (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(`{"version":"` + conf.version + `"}`);
    console.log("[raagi] [GET /] (" + req.ip + ")");
});

// Send command to server and reply with response in format:
// {"command":"...", "output":"..."}
app.post('/', (req, res) => {
    let conn = rcon({
        address: conf.servers[req.body.sid].ip,
        password: conf.servers[req.body.sid].pw
    });
    conn.connect().then(() => {
        return conn.command(req.body.command).then((status) => {
            res.setHeader("Content-Type", "application/json");
            res.send(`{"command":"` + req.body.command + `", "output":"${status}"}`);
            console.log("[raagi] [POST /] (" + req.ip + ")");
        });
    }).then(() => conn.disconnect());
});

// Listen for requests
https.createServer(options, app).listen(conf.port);
console.log('[raagi] Init kiwi/raagi | v' + conf.version + " | *:3000");