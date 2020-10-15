const Logger = require('../utils/Logger.js');

module.exports = class Event {
	name;
	once = false;
	client;

	/**
	 * Créé un nouvel évent.
	 * @param {EventOptions} options - Options de l'évent.
	 */
	constructor(options) {
		this.name = options?.name;
		this.once = options?.once;
	}

	/**
	 * Execute l'évent.
	 * @param {CustomClient} client - Le client.
	 * @param {any} [args] - Les arguments.
	 * @returns {void}
	 */
	run(client, ...args) {
		this.client = client;
	}
};
