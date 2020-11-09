const Command = require('../entities/Command.js');
const {tags} = require('../constants.js');
const {categories} = require('../constants.js');

module.exports = class RestartCommand extends Command {
	constructor() {
		super({
			name: 'restart',
			aliases: ['reboot', 'rb'],
			clientPermissions: [],
			category: categories.owner,
			description: '',
			tags: [tags.owner_only],
			usage: '',
			userPermissions: [],
		});
	}

	async run(client, message, args) {
		super.run(client, message, args);
		await super.send("Relancement du bot. (Ou arrêt du bot si le bot n'est pas sur le vps.)");
		process.exit(0);
	}
};
