const {parseDate} = require('../utils/FormatUtils.js');
const {logTypes} = require('../constants.js');
const {getKeyByValue} = require('../utils/Utils.js');


module.exports = class Logger {
	/**
	 * Process le message pour le log suivant les arguments.
	 * @example
	 * process("messsage", logsTypes.log, "Titre");
	 * // logging : [2020-05-22 01:37:40.0151][LOG][Titre] message
	 *
	 * @param {String} message - Message à log.
	 * @param {String} type - Type de log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static process(message, type, title = '') {
		function addSquare(string) {
			return `[${string}]`;
		}
		
		let result = `\x1b[${type}m${parseDate('[yyyy-MM-jj hh:mm:ss.SSSS]')}${addSquare(getKeyByValue(logTypes, type).toUpperCase())}`;
		if (title) {
			result += addSquare(title);
		}
		result += ` ${String(message)}`;
		
		console.log(result);
	}
	
	/**
	 *  Log un message (white).
	 * @param {any} message - Message à log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static log(message, title = '') {
		Logger.process(message, logTypes.log, title);
	}
	
	/**
	 *  Log un message d'info (blue).
	 * @param {any} message - Message à log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static info(message, title = '') {
		Logger.process(message, logTypes.info, title);
	}
	
	/**
	 *  Log un message de débug (magenta).
	 * @param {any} message - Message à log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static debug(message, title = '') {
		Logger.process(message, logTypes.debug, title);
	}
	
	
	/**
	 *  Log un message de warn (yellow).
	 * @param {any} message - Message à log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static warn(message, title = '') {
		Logger.process(message, logTypes.warn, title);
	}
	
	/**
	 *  Log un message d'erreur (rouge).
	 * @param {any} message - Message à log.
	 * @param {String} [title = ''] - Titre du log.
	 */
	static error(message, title = '') {
		Logger.process(message, logTypes.error, title);
	}
};