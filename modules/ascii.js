// kiwi/raagi/modules/ascii.js - Created January 3rd, 2018

const chalk = require('chalk');

// Pretty-print 'raagi' in green ascii art
// http://patorjk.com/software/taag/#p=display&f=Straight&t=raagi
const ascii = function() {
    console.log(
        chalk.green(` _  _   _   _  . \n` +
            `|  (_| (_| (_) | \n` +
            `           _/   `)
    );
};

// Export function as module
module.exports = ascii;