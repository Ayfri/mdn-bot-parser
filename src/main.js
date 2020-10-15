process.chdir(__dirname);

const {token} = require('../assets/jsons/config.json');
const CustomClient = require('./entities/Client.js');
const Logger = require('./utils/Logger.js');
const client = new CustomClient();

Logger.error('Starting...', 'Main');

(async () => {
	Logger.warn('Loading events.', 'Main');
	client.eventManager.loadEvents('events');

	Logger.warn('Loading commands.', 'Main');
	client.commandManager.loadCommands('commands');

	await client.login(token);
})();

module.exports = {client};
