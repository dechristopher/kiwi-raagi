// kiwi/log.js - Created on on September 1st, 2016

// NPM modules
const fs = require('fs');
const os = require('os');
const c = require('chalk');
const datetime = require('node-datetime');

// Static variables
const hostname = os.hostname();
const LOG = `[${c.green('raagi')} ~ ${hostname}]`;

/* Wraps console.log for printing pretty logging to stdout and to a file
    message: (string) message to log
    options: (object) logging configuration options
        Format:
        {
            logName: 'name of sub-log file' (default: none/undefined (global file log)) [appends to log file name XX-XX-XX-name.log]
            stdOut: 'whether or not to print log to console' (default: true)
        }
*/
module.exports = function(message, options = { 'logName': '', 'stdOut': true }) {
    // Define date formats for current function call
    let time = datetime.create().format('m-d-y H:M:S');
    let today = datetime.create().format('m-d-y');

    //Variable that includes time and logging prefix
    let prefix = `[${time}] ${LOG}`;

    // Default filename
    let file = `logs/${today}.log`;
    // Default line format
    let line = `${prefix} ${message}`;

    // Handle logname argument
    if (options.logName !== undefined && options.logName !== '') {
        file = `logs/${today}-${options.logName}.log`;
        line = `${prefix} [${options.logName}] ${message}`;
    }

    // Handle consoleOut argument
    if (options.stdOut !== false) {
        console.log(line);
    }

    // Begin log file ops
    fs.exists(file, function(exists) {
        if (exists) {
            // Write log entry
            fs.appendFile(file, `${line}${os.EOL}`, function(err) {
                if (err) {
                    return console.log(`${prefix} FILE LOGGING FAILED AT ${time} FOR MSG: ${line}`);
                }
            });
        } else {
            // Create the file
            fs.writeFile(file, `BEGIN RAAGI LOG FOR ${today}${os.EOL}`, function(err) {
                if (err) {
                    return console.log(`${prefix} LOG FILE CREATION FAILED AT ${time} FOR FILE: ${file}`);
                }
                console.log(`${prefix} Created new log >> ${file}`);
            });
            // Write log entry
            fs.appendFile(file, `${line}${os.EOL}`, function(err) {
                if (err) {
                    return console.log(`${prefix} FILE LOGGING FAILED AT ${time} FOR MSG: ${line}`);
                }
            });
        }
    });
};