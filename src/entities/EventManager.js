const {Collection} = require('discord.js');
const Logger = require('../utils/Logger.js');
const fs = require('fs');

module.exports = class EventManager {
	/**
	 *
	 * @type {module:"discord.js".Collection<String, Event>}
	 */
	static events = new Collection();
	client;

	constructor(client) {
		this.client = client;
	}

	bind(event) {
		EventManager.events.set(event.name, event);
		this.client.on(event.name, (...args) => event.run(this.client, ...args));
		Logger.log(`Event ${event.name} successfully bind.`);
	}

	async loadEvents(dirName) {
		const path = `./${dirName}`;
		const eventDir = fs.readdirSync(path);
		Logger.info(`Loading events in '${dirName}' directory.`);

		for (const eventFile of eventDir) {
			const event = new (require(`../${dirName}/${eventFile}`))();
			if (event) {
				this.bind(event);
			}
		}
	}

	unbind(event) {
		EventManager.events.delete(event.name);
		this.client.removeAllListeners(event.name);
		Logger.log(`Event ${event.name} successfully unbind.`);
	}
};
