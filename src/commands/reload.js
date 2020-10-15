const Command = require('../entities/Command.js');
const {
	categories,
	tags,
} = require('../constants.js');
module.exports = class ReloadCommand extends Command {
	constructor() {
		super({
			name:     'reload',
			aliases:  ['rl'],
			category: categories.owner,
			tags:     [tags.owner_only],
		});
	}
	
	async run(client, message, args) {
		super.run(client, message, args);
		const command = super.getCommand(args[0]);
		
		if (command) {
			const path = `../commands/${command.name}.js`;
			
			client.commandManager.unloadCommand(command);
			delete require.cache[require.resolve(path)];
			const commandRequired = new (require(path))();
			client.commandManager.loadCommand(commandRequired);
			
			super.send(`Commande ${command.name} rechargée.`);
		}
	}
};
