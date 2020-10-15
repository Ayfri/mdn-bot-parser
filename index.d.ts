import {Client, ClientEvents, Collection, Message, MessageAdditions, MessageOptions, PermissionResolvable, StringResolvable} from 'discord.js';

export class CustomClient extends Client {
	public commandManager: CommandManager;
	public commands: Collection<String, Command>;
	public eventManager: EventManager;
	public events: Collection<String, Event>;

	constructor();
}

export class CommandManager {
	public static commands: Collection<String, Command>;

	public static findCommand(name: String): Command;

	public loadCommands(dirName: String): Promise<void>;

	public loadCommand(command: Command): void;

	public unloadCommand(command: Command): void;
}

export class EventManager {
	public static events: Collection<String, Event>;

	public readonly client: CustomClient;

	constructor(client: CustomClient);

	public loadEvents(dirName: String): Promise<void>;

	public bind(event: Event): void;

	public unBind(event: Event): void;
}

export class Command {
	public aliases: String[];
	public category: Category;
	public clientPermissions: PermissionResolvable[];
	public description: String;
	public name: String;
	public tags: Tag[];
	public usage: String;
	public userPermissions: PermissionResolvable[];

	public message: Message;
	public client: CustomClient;
	public args: String[];

	public constructor(options: CommandOptions);

	public run(client: CustomClient, message: Message, args: String[]): Promise<void>;

	public send(content: StringResolvable, options?: MessageOptions | (MessageOptions & {split?: false}) | MessageAdditions): Promise<Message>;

	public getCommand(name: String): Command | null;
}

export class Event {
	public client: CustomClient;
	public name: keyof ClientEvents;

	public constructor(options: EventOptions);

	public run(client: CustomClient, ...args: ClientEvents[typeof name]): Promise<void>;
}

export class Logger {
	public static process(message: String, type: LogType, title?: String): void;

	public static log(message: any, title?: String): void;

	public static info(message: any, title?: String): void;

	public static debug(message: any, title?: String): void;

	public static warn(message: any, title?: String): void;

	public static error(message: any, title?: String): void;
}

export type LogType = 'debug' | 'log' | 'info' | 'warn' | 'error';
export type Tag = 'owner_only' | 'guild_only' | 'dm_only' | 'nsfw_only' | 'guild_owner_only' | 'help_command' | 'prefix_command' | 'hidden' | 'wip';
export type Category = 'development' | 'owner' | 'utils';

export interface CommandOptions {
	aliases?: String[];
	category?: Category;
	clientPermissions?: PermissionResolvable[];
	description?: String;
	name: String;
	tags?: Tag[];
	usage?: String;
	userPermissions?: PermissionResolvable[];
}

export interface EventOptions {
	name: String;
	once?: boolean;
}
