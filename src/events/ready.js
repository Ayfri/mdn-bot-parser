const Logger = require('../utils/Logger.js');
const Event = require('../entities/Event.js');

/**
 * @extends {Event}
 */
module.exports = class ReadyEvent extends Event {
	constructor() {
		super({
			name: 'ready',
			once: true,
		});
	}

	async run(client) {
		super.run(client);
		Logger.log('online !');
		Logger.debug(`Logged as ${client.user.tag}, ID : ${client.user.id}`);
	}
};
