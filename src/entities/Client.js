const {Client} = require('discord.js');
const CommandManager = require('../entities/CommandManager.js');
const EventManager = require('../entities/EventManager.js');

/**
 * Représente le client du bot.
 * @extends {module:"discord.js".Client}
 */
module.exports = class CustomClient extends Client {
	commandManager;
	eventManager;
	commands;
	events;
	
	constructor() {
		super();
		this.eventManager = new EventManager(this);
		this.commandManager = new CommandManager();
		this.commands = CommandManager.commands;
		this.events = EventManager.events;
	}
};