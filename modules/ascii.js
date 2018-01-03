// kiwi/raagi/modules/ascii.js - Created January 3rd, 2018

const chalk = require('chalk');

// Pretty-print 'raagi' in green ascii art
const ascii = function() {
    console.log(
        chalk.green(` _  _   _   _   o \n` +
            `)  (_( (_( (_(  ( \n` +
            `             _)   `)
    );
};

module.exports = ascii;