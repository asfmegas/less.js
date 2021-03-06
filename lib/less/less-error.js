var utils = require('./utils');
/**
 * This is a centralized class of any error that could be thrown internally (mostly by the parser).
 * Besides standard .message it keeps some additional data like a path to the file where the error
 * occurred along with line and column numbers.
 *
 * @class
 * @extends Error
 * @type {module.LessError}
 *
 * @prop {string} type
 * @prop {string} filename
 * @prop {number} index
 * @prop {number} line
 * @prop {number} column
 * @prop {number} callLine
 * @prop {number} callExtract
 * @prop {string[]} extract
 *
 * @param {Object} e              - An error object to wrap around or just a descriptive object
 * @param {Object} importManager  - An instance of ImportManager (see import-manager.js)
 * @param {string} [currentFilename]
 */
var LessError = module.exports = function LessError(e, importManager, currentFilename) {
    Error.call(this);

    var filename = e.filename || currentFilename;

    if (importManager && filename) {
        var input = importManager.contents[filename],
            loc = utils.getLocation(e.index, input),
            line = loc.line,
            col  = loc.column,
            callLine = e.call && utils.getLocation(e.call, input).line,
            lines = input.split('\n');

        this.type = e.type || 'Syntax';
        this.filename = filename;
        this.index = e.index;
        this.line = typeof line === 'number' ? line + 1 : null;
        this.callLine = callLine + 1;
        this.callExtract = lines[callLine];
        this.column = col;
        this.extract = [
            lines[line - 1],
            lines[line],
            lines[line + 1]
        ];
    }
    this.message = e.message;
    this.stack = e.stack;
};

if (typeof Object.create === 'undefined') {
    var F = function () {};
    F.prototype = Error.prototype;
    LessError.prototype = new F();
} else {
    LessError.prototype = Object.create(Error.prototype);
}

LessError.prototype.constructor = LessError;

/**
 * An overridden version of the default Object.prototype.toString
 * which uses additional information to create a helpful message.
 *
 * @param {Object} options
 * @returns {string}
 */
LessError.prototype.toString = function(options) {
    options = options || {};

    var message = '';
    var extract = this.extract;
    var error = [];
    var stylize = function (str) { return str; };
    if (options.stylize) {
        var type = typeof options.stylize;
        if (type !== 'function') {
            throw Error('options.stylize should be a function, got a ' + type + '!');
        }
        stylize = options.stylize;
    }

    if (typeof extract[0] === 'string') {
        error.push(stylize((this.line - 1) + ' ' + extract[0], 'grey'));
    }

    if (typeof extract[1] === 'string') {
        var errorTxt = this.line + ' ';
        if (extract[1]) {
            errorTxt += extract[1].slice(0, this.column) +
                stylize(stylize(stylize(extract[1].substr(this.column, 1), 'bold') +
                    extract[1].slice(this.column + 1), 'red'), 'inverse');
        }
        error.push(errorTxt);
    }

    if (typeof extract[2] === 'string') {
        error.push(stylize((this.line + 1) + ' ' + extract[2], 'grey'));
    }
    error = error.join('\n') + stylize('', 'reset') + '\n';

    message += stylize(this.type + 'Error: ' + this.message, 'red');
    if (this.filename) {
        message += stylize(' in ', 'red') + this.filename +
            stylize(' on line ' + this.line + ', column ' + (this.column + 1) + ':', 'grey');
    }

    message += '\n' + error;

    if (this.callLine) {
        message += stylize('from ', 'red') + (this.filename || '') + '/n';
        message += stylize(this.callLine, 'grey') + ' ' + this.callExtract + '/n';
    }

    return message;
};
