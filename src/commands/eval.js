const Command = require('../entities/Command.js');
const {formatByteSize} = require('../utils/FormatUtils.js');
const {categories} = require('../constants.js');

module.exports = class EvalCommand extends Command {
	constructor() {
		super({
			name             : 'eval',
			aliases          : [],
			clientPermissions: [],
			category         : categories.owner,
			description      : '',
			tags             : [],
			usage            : '',
			userPermissions  : [],
		});
	}
	
	async run(client, message, args) {
		super.run(client, message, args);
		
		function exec(callback) {
			try {
				return callback();
			} catch (error) {
				return error;
			}
		}
		
		async function wait(callback) {
			try {
				return await callback();
			} catch (error) {
				return error;
			}
		}
		
		let retour = null;
		let code = args.join(' ');
		const functionsPassages = [];
		const debug = code.includes('$debug');
		const log = code.includes('$log');
		
		
		let {guild, content, member, author, channel} = message;
		let members = message.guild?.members;
		
		if (code.includes('```')) {
			code = code.replace(/```([a-z0-9]+)?/g, '');
		}
		
		const cutText = text => {
			if (log) functionsPassages.push('cutText');
			const newText = [];
			
			if (text) {
				if (text.length >= 2000) {
					for (let i = 0; i < text.length / 1990; i++) {
						newText.push(text.slice(i * 1990, (i + 1) * 1990));
					}
				} else {
					newText.push(text);
				}
			}
			
			return newText;
		};
		
		const sendJS = text => {
			if (log) functionsPassages.push('sendJS');
			text = cutText(text);
			for (let i = 0; i < text.length; i++) {
				sendMarkdown(text[i], 'js');
			}
		};
		
		const verifyText = text => {
			if (log) functionsPassages.push('verifyText');
			if (debug) channel.send(text);
			
			if ( !text) text = 'undefined';
			if ( !text.toString() && !text.toString().length) text = text.toString();
			if ( !text.length) return sendJS('EvalError : Cannot send an empty message.');
			if (text.length > 2048) return sendJS('EvalError : Cannot send much than 2000 characters in one message.');
		};
		
		const send = text => {
			if (log) functionsPassages.push('send');
			verifyText(text);
			return channel.send(text);
		};
		
		const sendMarkdown = (text, lang) => {
			if (log) functionsPassages.push('sendMarkdown');
			return send(`\`\`\`${lang}\n${text}\`\`\``);
		};
		
		const sendBig = (text, js = false) => {
			if (log) functionsPassages.push('sendBig');
			text = cutText(text.toString());
			
			js ? text.forEach(t => sendJS(t)) : text.forEach(t => send(t));
		};
		
		const sendMp = text => {
			if (log) functionsPassages.push('sendMp');
			verifyText(text);
			author.send(text);
		};
		
		const getMember = find => {
			if (log) functionsPassages.push('getMember');
			find = find.toLowerCase();
			return guild.members.get(find) || guild.members.find((m) => m['displayName'].toLowerCase().includes(find) || m['user'].username.toLowerCase().includes(find)) || sendJS('GetError : Nothing found.');
		};
		
		const getChannel = find => {
			if (log) functionsPassages.push('getChannel');
			find = find.toLowerCase();
			return guild.channels.get(find) || guild.channels.find((m) => m['name'].toLowerCase().includes(find)) || sendJS('GetError : Nothing found.');
		};
		
		const sendTo = (text, id) => {
			if (log) functionsPassages.push('sendTo');
			if (debug) channel.send(text);
			return client.channels.has(id) ? client.channels.get(id).send(text) : client.users.has(id) ? client.users.get(id).send(text) : sendJS('GetError : Nothing found.');
		};
		
		const stringify = object => {
			if (log) functionsPassages.push('stringify');
			return typeof object === 'object' ? sendMarkdown(JSON.stringify(object, null, '\t'), 'json') : sendJS(`ConvertError : ${object} is not an object.`);
		};
		
		const delMsg = () => {
			if (log) functionsPassages.push('delMsg');
			if (guild.me.permissions.has('MANAGE_MESSAGES', false)) message.delete();
		};
		
		const listProps = (object, lang = 'js') => {
			if (log) functionsPassages.push('listProps');
			let toSend = '';
			for (const key of Object.getOwnPropertyNames(object).sort()) {
				let classOfObject = 'void',
					value = object[key];
				if (value !== null && value.constructor) classOfObject = value.constructor.name;
				if ( !['String', 'Boolean', 'void', 'Number', 'Array', 'Message'].includes(classOfObject)) value = typeof value;
				if ( !value) value = 'undefined';
				if (value.length === 0) value = '[Object object]';
				toSend += `${key} = ${value} (${classOfObject})\n`;
			}
			
			return sendMarkdown(toSend, lang);
		};
		
		const listKeys = object => {
			if (log) functionsPassages.push('listKeys');
			if (typeof object !== 'object') return sendJS(`ConvertError : ${object} is not an object.`);
			return sendJS(Object.keys(object).sort().join('\n'));
		};
		
		const sizeOf = (object) => {
			if (log) functionsPassages.push('sizeOf');
			const objectList = [];
			const recurse = value => {
				let bytes = 0;
				
				if (typeof value === 'boolean') {
					bytes = 4;
				} else if (typeof value === 'string') {
					bytes = value.length * 2;
				} else if (typeof value === 'number') {
					bytes = 8;
				} else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
					objectList[objectList.length] = value;
					
					for (const i in value) {
						bytes += 8; // an assumed existence overhead
						bytes += recurse(value[i]);
					}
				}
				
				return bytes;
			};
			
			return formatByteSize(recurse(object));
		};
		
		function logFunctionsPassages() {
			sendJS(functionsPassages.join('➡\n'));
		}
		
		const functions = () => {
			if (log) functionsPassages.push('functions');
			const functions = [
				'cutText',
				'delMsg',
				'getChannel',
				'getFirstCreated',
				'getFirstJoined',
				'getMember',
				'listKeys',
				'listProps',
				'sendBig',
				'sendJS',
				'sendMarkdown',
				'sendMp',
				'sendTo',
				'sizeOf',
				'stringify',
				'verifyText'
			];
			return sendJS(functions.sort().join('\n'));
		};
		
		try {
			if (code.includes('await')) {
				code = `wait(async function(){\n\t${code.replace(/\n/g, '\n\t')}\n})`;
			} else {
				code = `exec(function(){\n\t${code.replace(/\n/g, '\n\t')}\n})`;
			}
			
			retour = await eval(code);
			if (log) logFunctionsPassages();
			if (retour) sendJS(retour);
			return await message.react('✔');
		} catch (err) {
			await message.react('❗');
			Error.stackTraceLimit = 3;
			return sendJS(err.stack);
		}
	}
};