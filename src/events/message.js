const CommandManager = require('../entities/CommandManager.js');
const Event = require('../entities/Event.js');
const {isOwner} = require('../utils/Utils.js');
const {tags} = require('../constants.js');
const {prefixes} = require('../../assets/jsons/config.json');

/**
 * @extends {Event}
 */
module.exports = class MessageEvent extends Event {
	message;

	constructor() {
		super({
			name: 'message',
		});
	}

	/**
	 * Execute la commande.
	 * @returns {void}
	 * @private
	 */
	executeCommand(command) {
		command.run(this.client, this.message, this.args);
	}

	/**
	 * Récupère le préfixe depuis le message.
	 * @returns {string | null} - Le préfixe trouvé ou null si aucun préfixe trouvé.
	 * @private
	 */
	getPrefixFromMessage() {
		let prefix = null;
		prefixes.push(this.client.user.toString());
		prefixes.push(`<@!${this.client.user.id}>`);

		for (const possiblePrefix of prefixes) {
			if (this.message.content.startsWith(possiblePrefix.trim())) prefix = possiblePrefix.trim();
		}

		prefixes.pop();
		prefixes.pop();

		return prefix;
	}

	/**
	 * Execute l'évent message.
	 * @param {CustomClient} client - Le client.
	 * @param {Message} message - Le message.
	 * @returns {void}
	 */
	async run(client, message) {
		super.run(client);
		this.message = message;

		if (message.author.bot || message.system) return;

		const prefix = this.getPrefixFromMessage() ?? '';
		this.args = message.content
			.slice(prefix.length)
			.split(/\s+/g)
			.filter(arg => arg);

		if (prefix) {
			const command = CommandManager.findCommand(this.args[0] ?? '');
			if (message.content.split(/\s+/g)[0] === prefix && !command) {
				client.commands.filter(command => command.tags.includes(tags.prefix_command)).forEach(command => this.executeCommand(command));
				return;
			}

			this.args.shift();

			if (command) {
				if (command.tags.includes(tags.owner_only)) {
					if (isOwner(message.author.id)) {
						this.executeCommand(command);
						return;
					}

					return;
				}

				this.executeCommand(command);
			}
		}
	}
};
