const CommandManager = require('./CommandManager.js');
const Logger = require('../utils/Logger.js');

module.exports = class Command {
	aliases = [];
	category = 'none';
	clientPermissions = [];
	description = '';
	name;
	tags = [];
	usage = '';
	userPermissions = [];

	message;
	client;
	args = [];

	/**
	 * Créé une nouvelle commande.
	 * @param {CommandOptions} options - Les options de la commande.
	 */
	constructor(options) {
		this.aliases = options?.aliases;
		this.category = options?.category;
		this.clientPermissions = options?.clientPermissions;
		this.description = options?.description;
		this.name = options.name;
		this.tags = options?.tags;
		this.usage = options?.usage;
		this.userPermissions = options?.userPermissions;
	}

	/**
	 * Permet de récupérer une commande facilement.
	 * @param {string} name - Le nom de la commande (ou un de ses alias).
	 * @returns {Command | null} - La commande.
	 */
	getCommand(name) {
		return CommandManager.findCommand(name ?? '');
	}

	/**
	 * Fonction exécutée quand la commande est exécutée.
	 * @param {CustomClient} client - Le client.
	 * @param {module:"discord.js".Message} message - Le message.
	 * @param {string[]} args - Les arguments.
	 * @returns {void}
	 */
	run(client, message, args) {
		this.client = client;
		this.message = message;
		this.args = args;
		Logger.log(`Command '${this.name}' executed by '${message.author.tag}'.`);
	}

	/**
	 * Envoie un message.
	 * @param {StringResolvable|APIMessage} [content=''] - Le contenu à envoyer.
	 * @param {MessageOptions|MessageAdditions} [options={}] - Les options à fournir.
	 * @returns {Promise<Message>|Message} - Le message.
	 */
	async send(content, options) {
		return await this.message.channel.send(content, options);
	}
};
