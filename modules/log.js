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
module.exports = function(message, options = { 'logName': '', 'stdOut': true, 'usePrefix': true }) {
    // Define date formats for current function call
    let time = datetime.create().format('m-d-y H:M:S');
    let today = datetime.create().format('m-d-y');

    //Variable that includes time and logging prefix
    let prefix = `[${time}] ${LOG}`;
    let filePrefix = `[${time}] [${hostname}]`;

    // Default filename
    let file = `logs/${today}.log`;
    // Default line format
    let line = `${prefix} ${message}`;
    let fileLine = `${filePrefix} ${message}${os.EOL}`;

    // Handle logname argument
    if (options.logName !== undefined && options.logName !== '') {
        file = `logs/${today}-${options.logName}.log`;
        line = `${prefix} [${options.logName}] ${message}`;
    }

    if (!options.usePrefix) {
        line = `${message}`;
        fileLine = `${message}`;
    }

    // Handle consoleOut argument
    if (options.stdOut !== false) {
        console.log(line);
    }

    // Strip color codes from logs
    // line = stripColors(line);

    // Build strings
    const strBeginLog = `BEGIN RAAGI LOG FOR ${today}${os.EOL}`;
    const strCreatedLog = `${prefix} Created new log >> ${file}`;
    const strLogCreationFailed = `${prefix} LOG FILE CREATION FAILED AT ${time} FOR FILE: ${file}`;
    const strFileLoggingFailed = `${prefix} FILE LOGGING FAILED AT ${time} FOR MSG: ${fileLine}`;

    return new Promise(function(resolve, reject) {
        // Begin log file ops
        fs.exists(file, function(exists) {
            if (exists) {
                // Write log entry
                fs.appendFile(file, fileLine, function(err) {
                    if (err) {
                        console.log(strFileLoggingFailed);
                        reject(err);
                    }
                    resolve();
                });
            } else {
                // Create the file
                fs.writeFile(file, strBeginLog, function(err) {
                    if (err) {
                        console.log(strLogCreationFailed);
                        reject(err);
                    }
                    console.log(strCreatedLog);
                });
                // Write log entry
                fs.appendFile(file, fileLine, function(err) {
                    if (err) {
                        console.log(strFileLoggingFailed);
                        reject(err);
                    }
                    resolve();
                });
            }
        });
    });
};

// Bash color codes
const colorCodes = [
    '[30m', '[31m', '[32m', '[33m', '[34m', '[35m', '[36m', '[37m', '[38m', '[39m'
];

// Strips bash color codes from an input line
const stripColors = function(line) {
    colorCodes.forEach(function(code) {
        line.replace(code, '');
    });
    return line;
};