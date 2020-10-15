const Command = require('../entities/Command.js');
const {categories, tags} = require('../constants.js');
const axios = require('axios');
const {cutTextIfTooLong, toSup} = require('../utils/Utils.js');
const {JSDOM} = require('jsdom');
const {MessageEmbed, Collection} = require('discord.js');

/**
 * @typedef {'infos'|'moreInfos'|'methods'|'properties'|'staticMethods'|'staticProperties'} MDNEmbedType
 */

/**
 * @typedef {Object} MDNEmbedKey
 * @property {string} link
 * @property {MDNEmbedType} type
 */

module.exports = class DocCommand extends Command {
	static domain = 'https://developer.mozilla.org';
	static logo = 'https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png';
	static cache = new Collection();
	static historic = new Collection();
	emojis = {};

	constructor() {
		super({
			name: 'doc',
			description: 'Donne des informations sur une classe/méthode/propriété.',
			usage: 'doc String\ndoc Array.prototype.sort\ndoc Math.cos\ndoc Map.prototype.size',
			category: categories.development,
			tags: [tags.prefix_command],
		});
	}

	/**
	 * Change l'embed du message par rapport aux options.
	 * @param {Object} infos
	 * @param {MDNEmbedKey} options
	 * @param {Message} message
	 * @returns {Promise<void>}
	 */
	async changeToEmbed(infos, options, message) {
		const embedKey = DocCommand.cache.findKey(k => k.link === options.link && k.type === options.type);
		DocCommand.historic.set(message.author.id, options);

		if (embedKey) {
			await message.edit(DocCommand.cache.get(embedKey));
		} else {
			const embed = await this.createEmbedFromMDNEmbedKey(options, infos, message);
			await message.edit(embed);
			DocCommand.cache.set(options, embed);
		}
	}

	/**
	 * Create the collector.
	 * @param {Message} commandMessage - Message that executes the command.
	 * @param {Message} mainMessage - Main message sent by user.
	 * @param {module:"discord.js".Client} client - Discord client.
	 * @param {string} link - The link of the object from documentation.
	 * @param {Object} infos - The informations collected from the website.
	 * @returns {Promise<void>}
	 */
	async createCollector(commandMessage, mainMessage, client, link, infos) {
		const filter = (reaction, user) =>
			user.id === commandMessage.author.id &&
			(Array.from(Object.values(this.emojis))
				.map(e => e.id)
				.includes(reaction.emoji.id) ||
				Array.from(Object.values(this.emojis)).includes(reaction.emoji.name));
		const collector = mainMessage.createReactionCollector(filter);
		await commandMessage.reactions.cache.find(r => r.emoji.id === this.emojis.waitEmoji.id).users.remove(client.user.id);

		collector.on('collect', async reaction => {
			const mdnEmbedKey = {
				type: 'infos',
				link: link,
			};

			mdnEmbedKey.type = DocCommand.historic.get(commandMessage.author.id)?.type || Array.from(Object.values(this.emojis)).find(e => e.id === reaction.emoji.id)?.name || mdnEmbedKey.type;

			await this.changeToEmbed(infos, mdnEmbedKey, mainMessage);
		});
	}

	/**
	 * Créé un embed en rapport avec la clé.
	 * @param {MDNEmbedKey} key
	 * @param {Object} infos
	 * @param {Message} message
	 * @returns {Promise<module:"discord.js".MessageEmbed|*>}
	 */
	async createEmbedFromMDNEmbedKey(key, infos, message) {
		let embed = new MessageEmbed();

		if (key.type === 'moreInfos') {
			embed = this.setMoreInfos(embed, infos, key.link);
		} else if (key.type === 'infos') {
			embed = this.setMainInfos(embed, infos, key.link);
		} else {
			let name;
			switch (key.type) {
				case 'methods':
					name = `${this.emojis.methods} Méthodes`;
					break;

				case 'properties':
					name = `${this.emojis.properties} Propriétés`;
					break;

				case 'staticProperties':
					name = `${this.emojis.staticMethods} Propriétés statiques`;
					break;

				case 'staticMethods':
					name = `${this.emojis.staticProperties} Méthodes statiques`;
					break;
			}

			embed = this.setEmbedFromFieldsCategory(infos[key.type], embed, key.link, name);
		}

		return embed;
	}

	/**
	 * Get the website DOM (or an error).
	 * @param {string} link
	 * @param {Message} message
	 * @returns {Promise<{website: *, error: *}>}
	 */
	async getSite(link, message) {
		let website;
		let error;

		try {
			website = await axios.get(link);
			await message.react(this.emojis.waitEmoji);
		} catch (e) {
			error = e;
		}

		return {
			website,
			error,
		};
	}

	/**
	 * Generate new informations for parsing MDN.
	 * @returns {{methods: {}, description: string, staticProperties: {}, shortDescription: string, specifications: [], examples: string, name: string, staticMethods: {}, lookAlso: [], syntax: string, compatibility: null, parameters: string, returnedValue: string, properties: {}}}
	 */
	newInfos() {
		return {
			compatibility: null, // pas fait encore
			shortDescription: '',
			examples: '',
			description: '',
			lookAlso: [],
			methods: {},
			name: '',
			parameters: '',
			properties: {},
			returnedValue: '',
			specifications: [], // pas fait encore
			staticMethods: {},
			staticProperties: {},
			syntax: '',
		};
	}

	/**
	 * Remplace une liste HTML par un objet contenant [nom : valeur].
	 * @param {HTMLUListElement} list - Le HTML.
	 * @returns {Object} - L'objet.
	 * @private
	 */
	parseHTMLList(list) {
		let result = {};
		let e = [];
		if (list.tagName === 'DIV') {
			result.description = list.getElementsByTagName('p')?.item(0)?.innerHTML ?? undefined;
			const dl = Array.from(list.getElementsByTagName('dl')).map(d => this.parseHTMLList(d));
			Object.assign(result, ...dl);
			return result;
		}

		for (let i = 0; i < list.childElementCount; i++) {
			const element = list.children[i];
			switch (element.tagName) {
				case 'DT':
					e.push(`${element.textContent} :`);
					break;

				case 'DD':
					e.push(element.innerHTML);
					break;
			}

			if (e.length === 2) {
				result[e[0]] = e[1];
				e = [];
			}
		}

		return result;
	}

	/**
	 * Remplace les tags HTML de formats pour les renvoyer en markdown Discord.
	 * @param {String} text - Le HTML.
	 * @returns {string} - Le texte reformatté.
	 * @private
	 */
	parseHTMLTagsToMarkdown(text = '') {
		if (!text) text = '';

		do {
			text = text
				.replace(/ ?(class|id|rel)="[^"]*?"/g, '')
				.replace(/<a\s*href="(.+?)">(.+?)<\/a>/, (str, link, content) => `[${content}](${link.startsWith('http') ? link : DocCommand.domain + link})`)
				.replace(/<pre>((.|\n)*?)<\/pre>/gm, '```js\n$1```')
				.replace(/<span>(.+?)<\/span>/g, '$1')
				.replace(/<var>(.*?)<\/var>/g, '$1')
				.replace(/<p>(.*?)<\/p>/g, '$1\n')
				.replace(/<br\/?>/g, '\n')
				.replace(/<em>(.*?)<\/em>/g, '*$1*')
				.replace(/<i>(.*?)<\/i>/g, '*$1*')
				.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
				.replace(/<code>(\*{0,3})([^*]*?)(\*{0,3})<\/code>/g, '$1`$2`$3')
				.replace(/<sup>(.*?)<\/sup>/g, (str, result) => toSup(result))
				.replace(/&nbsp;/g, ' ')
				.replace(/&lt;/g, '<')
				.replace(/<h3>(.*?)<\/h3>/g, '> **$1**');
		} while (/<(.+?) ((href|classes|id)=".+?")*>.+?<\/(\1)>/m.test(text));

		return text;
	}

	/**
	 * Remplace la partie 'Look Also' par du texte.
	 * @param {HTMLUListElement} list - Le HTML.
	 * @returns {string} - Le texte.
	 */
	parseLookAlso(list) {
		let result = '';
		for (let i = 0; i < list.childElementCount; i++) {
			const element = list.children[i];
			result += `**•** ${element.innerHTML}\n\n`;
		}

		return result;
	}

	/**
	 * Remplace une liste de paramètres par du texte.
	 * @param {HTMLUListElement} list - Le HTML.
	 * @returns {String} - Le texte.
	 * @private
	 */
	parseParameters(list) {
		let result = '';
		for (let i = 0; i < list.childElementCount; i++) {
			const element = list.children[i];

			switch (element.tagName) {
				case 'DT':
					if (Array.from(element.children).find(e => e.tagName === 'H3')) break;

					const code = element.innerHTML.replace(/<code>(.+?)<\/code>.+/g, '$1');
					result += `\n**\`${code}\` (${element.textContent.replace(code, '')})** :`;
					break;

				case 'DD':
					result += `\n${element.innerHTML}\n`;
					break;
			}
		}

		return result;
	}

	/**
	 * Returns informations for parsing a dom.
	 * @param {any} dom
	 * @returns {{methods: {}, description: string, staticProperties: {}, shortDescription: string, specifications: *[], examples: string, name: string, staticMethods: {}, lookAlso: *[], syntax: string, compatibility: null, parameters: string, returnedValue: string, properties: {}}}
	 */
	parseWebsiteInfos(dom) {
		const infos = this.newInfos();
		const article = dom.getElementById('wikiArticle');
		const header = dom.getElementsByClassName('documentation-page-header')[0];

		infos.name = header.getElementsByTagName('h1')[0].textContent;
		infos.shortDescription = article.getElementsByTagName('p')[0].innerHTML;

		let articleName = '';
		for (let i = 0; i < article.childElementCount; i++) {
			let element = article.children[i];

			if (element.tagName === 'DL') {
				if (element.getElementsByTagName('h3').length > 0) {
					articleName = element.getElementsByTagName('h3')[0].id;
				}
			}

			if (articleName === 'Exemples') {
				if (element.tagName.match(/h[1-2]/i)) {
					articleName = element.id;
				}
			}

			if (element.tagName.match(/h[1-3]/i) && articleName !== 'Exemples') {
				articleName = element.id;
			} else {
				if (!element.textContent) continue;

				if (articleName === 'Syntaxe') {
					infos.syntax += `\n${element.outerHTML}`;
				} else if (articleName === 'Paramètres') {
					infos.parameters += `\n${this.parseParameters(element)}`;
				} else if (articleName === 'Valeur_de_retour') {
					infos.returnedValue += `\n${element.outerHTML}`;
				} else if (articleName === 'Description') {
					infos.description += `\n${element.outerHTML}`;
				} else if (articleName === 'Propriétés' || articleName.startsWith('Propriétés_du_constructeur')) {
					infos.staticProperties = this.parseHTMLList(element);
				} else if (articleName === 'Méthodes' || articleName.startsWith('Méthodes_du_constructeur')) {
					infos.staticMethods = this.parseHTMLList(element);
				} else if (articleName === 'Les_propriétés' || articleName === 'Propriétés_2') {
					infos.properties = this.parseHTMLList(element);
				} else if (articleName === 'Méthodes_2' || articleName === 'Les_méthodes') {
					infos.methods = Object.assign(infos.methods, this.parseHTMLList(element));
				} else if (articleName === 'Exemples') {
					infos.examples += `\n${element.outerHTML}`;
				} else if (articleName === 'Voir_aussi') {
					infos.lookAlso = this.parseLookAlso(element);
				}
			}
		}

		return infos;
	}

	/**
	 *
	 * @param client
	 * @param message
	 * @param {String[]} args
	 * @returns {void}
	 */
	async run(client, message, args) {
		await super.run(client, message, args);

		this.emojis = {
			classes: client.emojis.cache.get('742675256996659250'),
			clipboard: '📋',
			constant: client.emojis.cache.get('742675256963235979'),
			functions: client.emojis.cache.get('742678946251931729'),
			methods: client.emojis.cache.get('743086936004231168'),
			moreInfos: client.emojis.cache.get('742678468759912518'),
			parameter: client.emojis.cache.get('742675256686280716'),
			properties: client.emojis.cache.get('742675256950521906'),
			staticProperties: client.emojis.cache.get('743087457721122908'),
			staticMethods: client.emojis.cache.get('743087456751976508'),
			return: '↩',
			waitEmoji: client.emojis.cache.get('742682405906677840'),
		};

		const link = `${DocCommand.domain}/fr/docs/Web/JavaScript/Reference/Objets_globaux/${args[0]}`;
		const result = await this.getSite(link, message);

		if (result.error?.message?.includes('Request failed with status code 404')) return await super.send('Pas trouvé. (temporaire)');
		if (result.error) return;

		const dom = new JSDOM(result.website.data, {runScripts: 'dangerously'}).window.document;
		const infos = this.parseWebsiteInfos(dom);
		const mainEmbed = await this.createEmbedFromMDNEmbedKey(
			{
				type: 'infos',
				link: link,
			},
			infos,
			message
		);

		const mainMessage = await super.send(mainEmbed);

		await mainMessage.react(this.emojis.clipboard);
		await mainMessage.react(this.emojis.moreInfos);
		await mainMessage.react(this.emojis.methods);
		await mainMessage.react(this.emojis.properties);
		await mainMessage.react(this.emojis.staticMethods);
		await mainMessage.react(this.emojis.staticProperties);
		await mainMessage.react(this.emojis.return);

		await this.createCollector(message, mainMessage, client, link, infos);
	}

	/**
	 * Transforme une liste de fields dans un objet en un embed propre.
	 * @param {Object} object - La Liste de fields.
	 * @param {module:"discord.js".MessageEmbed} embed - L'embed.
	 * @param {String} link - Le lien de l'objet.
	 * @param {String} name - Le nom des fields.
	 * @retuns {void}
	 * @private
	 */
	setEmbedFromFieldsCategory(object, embed, link, name) {
		if (Object.keys(object).length > 0) {
			embed.setTitle(`${name} :`);
			embed.setURL(link);
			object = Object.fromEntries(Object.entries(object).slice(0, 25));

			for (const property in object) {
				if (!object.hasOwnProperty(property) || !object[property] || property === 'description') continue;
				embed.addField(property, this.parseHTMLTagsToMarkdown(object[property]));
			}

			if (object.description) {
				embed.setDescription(this.parseHTMLTagsToMarkdown(object.description));
			}
		}

		return embed;
	}

	/**
	 * Sets the informations for the main embed.
	 * @param {module:"discord.js".MessageEmbed} embed
	 * @param {Object} infos
	 * @param {String} link
	 * @returns {MessageEmbed}
	 */
	setMainInfos(embed, infos, link) {
		embed.setTitle(`${infos.name.charAt(0) === infos.name.charAt(0).toUpperCase() ? `${this.emojis.classes} Classe` : `${this.emojis.functions} Fonction`} ${infos.name} :`);
		embed.setURL(link);
		embed.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.description)));
		embed.setFooter('Cliquez sur les réactions pour naviguer entre les catégories.');
		if (infos.shortDescription) embed.addField('Description courte : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.shortDescription), 1024));
		if (infos.syntax) embed.addField('Syntaxe : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.syntax), 1024));
		if (infos.parameters) embed.addField(`${this.emojis.parameter} Paramètres : `, cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.parameters), 1024));
		if (infos.returnedValue) embed.addField('Valeur de retour : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.returnedValue), 1024));

		return embed;
	}

	/**
	 * Sets the informations for the moreInfos embed.
	 * @param {module:"discord.js".MessageEmbed} embed
	 * @param {Object} infos
	 * @param {String} link
	 * @returns {MessageEmbed}
	 */
	setMoreInfos(embed, infos, link) {
		embed.setTitle(`${this.emojis.moreInfos} Informations supplémentaires : `);
		if (infos.examples) {
			embed.setURL(link);
			embed.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.examples)));
		}
		if (infos.lookAlso) embed.addField('Voir aussi : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.lookAlso)));

		return embed;
	}
};
