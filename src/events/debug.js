const Logger = require('../utils/Logger.js');
const Event = require('../entities/Event.js');
const {inspect} = require('util');

/**
 * @extends {Event}
 */
module.exports = class DebugEvent extends Event {
	constructor() {
		super({
			name: 'debug',
		});
	}
	
	async run(info) {
		Logger.debug(inspect(info));
	}
};
