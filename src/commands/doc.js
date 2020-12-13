const Command = require('../entities/Command.js');
const {
	categories,
	tags,
} = require('../constants.js');
const axios = require('axios');
const {
	cutTextIfTooLong,
	toSup,
} = require('../utils/Utils.js');
const {JSDOM} = require('jsdom');
const {
	MessageEmbed,
	Collection,
} = require('discord.js');

/**
 * @typedef {'infos'|'moreInfos'|'methods'|'properties'|'staticMethods'|'staticProperties'} MDNEmbedType
 */

/**
 * @typedef {object} MDNEmbedKey
 * @property {string} link - Le lien.
 * @property {MDNEmbedType} type - Le type.
 */

/**
 * @typedef {object} Infos
 * @property {null} compatibility -
 * @property {string} description -
 * @property {string} examples -
 * @property {string} lookAlso -
 * @property {object} methods -
 * @property {string} name -
 * @property {string} parameters -
 * @property {object} properties -
 * @property {string} returnedValue -
 * @property {string} shortDescription -
 * @property {Array} specifications -
 * @property {object} staticMethods -
 * @property {object} staticProperties -
 * @property {string} syntax -
 */

module.exports = class DocCommand extends Command {
	static domain = 'https://developer.mozilla.org';
	static nativeObjectsUrl = 'https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux';
	static logo = 'https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png';
	static cache = new Collection();
	static historic = new Collection();
	emojis = {};
	
	constructor() {
		super({
			name:        'doc',
			description: 'Donne des informations sur une classe/méthode/propriété.',
			usage:       'doc String\ndoc Array.prototype.sort\ndoc Math.cos\ndoc Map.prototype.size',
			category:    categories.development,
			tags:        [tags.prefix_command],
		});
	}
	
	/**
	 * Ajoute l'embed des réactions au message (actuellement une méthode car sinon répétition de code).
	 * @param {module:"discord.js".MessageEmbed} embed - L'embed.
	 * @param {Infos} infos
	 * @returns {void}
	 */
	addReactionsField(embed, infos) {
		let value = `${this.emojis.clipboard} : Informations principales.\n`;
		value += `${this.emojis.moreInfos} : Informations supplémentaires.\n`;
		if (JSON.stringify(infos.methods).slice(1, -1).length > 0) value += `${this.emojis.methods} : Méthodes d'instances.\n`;
		if (JSON.stringify(infos.properties).slice(1, -1).length > 0) value += `${this.emojis.properties} : Propriétés d'instances.\n`;
		if (JSON.stringify(infos.staticMethods).slice(1, -1).length > 0) value += `${this.emojis.staticMethods}: Méthodes statiques.\n`;
		if (JSON.stringify(infos.staticProperties).slice(1, -1).length > 0) value += `${this.emojis.staticProperties} : Propriétés statiques.\n`;
		value += `${this.emojis.return} : Retour en arrière.`;
		
		embed.addField('Cliquez sur les réactions pour naviguer entre les catégories :', value);
	}
	
	/**
	 * Change l'embed du message par rapport à la clé.
	 * @param {Infos} infos - Les informations.
	 * @param {MDNEmbedKey} key - La clé de l'embed.
	 * @param {Message} message - Le message.
	 * @returns {Promise<void>} - Rien.
	 */
	async changeToEmbed(infos, key, message) {
		const embedKey = DocCommand.cache.findKey(k => k.link === key.link && k.type === key.type);
		DocCommand.historic.set(message.author.id, key);
		
		if (embedKey) {
			await message.edit(DocCommand.cache.get(embedKey));
		} else {
			const embed = await this.createEmbedFromMDNEmbedKey(key, infos, message);
			await message.edit(embed);
			DocCommand.cache.set(key, embed);
		}
	}
	
	/**
	 * Create the collector.
	 * @param {Message} commandMessage - Message that executes the command.
	 * @param {Message} mainMessage - Main message sent by user.
	 * @param {module:"discord.js".Client} client - Discord client.
	 * @param {string} link - The link of the object from documentation.
	 * @param {Infos} infos - The informations collected from the website.
	 * @returns {Promise<void>}
	 */
	async createCollector(commandMessage, mainMessage, client, link, infos) {
		const filter = (reaction, user) => user.id === commandMessage.author.id && (Object.values(this.emojis)
		                                                                                  .map(e => e.id)
		                                                                                  .includes(reaction.emoji.id) || Object.values(this.emojis).includes(reaction.emoji.name));
		const collector = mainMessage.createReactionCollector(filter);
		await commandMessage.reactions.cache.find(r => r.emoji.id === this.emojis.waitEmoji.id).users.remove(client.user.id);
		
		collector.on('collect', async (reaction, user) => {
			const mdnEmbedKey = {
				type: 'infos',
				link,
			};
			
			mdnEmbedKey.type = DocCommand.historic.get(commandMessage.author.id)?.type || Object.values(this.emojis).find(e => e.id === reaction.emoji.id)?.name || mdnEmbedKey.type;
			mainMessage.reactions.cache.find(r => r.emoji === reaction.emoji).users.remove(user.id);
			await this.changeToEmbed(infos, mdnEmbedKey, mainMessage);
		});
	}
	
	/**
	 * Return the list of the default natives objects in JavaScript, list from MDN.
	 * @param {Message} message - The discord message that executed the command.
	 * @param {string} [failedSearch = ''] - The failed search if there is.
	 * @returns {Promise<module:"discord.js".MessageEmbed>} - The resulting embed.
	 */
	async createDefaultListEmbed(message) {
		const result = await this.getSite(DocCommand.nativeObjectsUrl, message);
		const dom = new JSDOM(result.website.data, {runScripts: 'dangerously'}).window.document;
		const article = dom.getElementById('wikiArticle');
		const embed = new MessageEmbed();
		
		embed.setTitle('Liste des objets natifs.');
		embed.setURL(DocCommand.nativeObjectsUrl);
		embed.setFooter(`Faites doc [Element] pour récupérer des informations sur un élément.`, message.client.user.displayAvatarURL());
		
		let name = '';
		let value = '';
		for (let i = 0; i < article.childElementCount; i++) {
			const element = article.children[i];
			
			if (element.tagName === 'H3') {
				if (value.length > 0) {
					embed.addField(name, cutTextIfTooLong(value, 1024), true);
					value = '';
				}
				name = element.textContent;
				
			} else if (element.tagName === 'UL') {
				for (let j = 0; j < element.childNodes.length; j++) {
					const childNode = element.childNodes[j];
					if (childNode.textContent?.replace(/\s+/g, '').length > 0) value += `\`${childNode.textContent.trim()}\`\n`;
				}
			}
		}
		
		return embed;
	}
	
	/**
	 * Créé un embed en rapport avec la clé.
	 * @param {MDNEmbedKey} key - La clé.
	 * @param {object} infos - Les informations.
	 * @param {Message} message - Le message.
	 * @returns {Promise<module:"discord.js".MessageEmbed|*>} - L'embed.
	 */
	async createEmbedFromMDNEmbedKey(key, infos, message) {
		let embed = new MessageEmbed();
		
		switch (key.type) {
			case 'moreInfos':
				embed = this.setMoreInfos(embed, infos, key.link);
				break;
			
			case 'infos':
				embed = this.setMainInfos(embed, infos, key.link);
				break;
			
			case 'methods':
				this.setEmbedFromFieldsCategory(infos[key.type], embed, key.link, `${this.emojis.methods} Méthodes`);
				break;
			
			case 'properties':
				this.setEmbedFromFieldsCategory(infos[key.type], embed, key.link, `${this.emojis.properties} Propriétés`);
				break;
			
			case 'staticProperties':
				this.setEmbedFromFieldsCategory(infos[key.type], embed, key.link, `${this.emojis.staticMethods} Propriétés statiques`);
				break;
			
			case 'staticMethods':
				this.setEmbedFromFieldsCategory(infos[key.type], embed, key.link, `${this.emojis.staticProperties} Méthodes statiques`);
				break;
		}
		
		this.addReactionsField(embed, infos);
		
		return embed;
	}
	
	/**
	 * Get the website DOM (or an error).
	 * @param {string} link - The website link.
	 * @param {Message} message - The message.
	 * @returns {Promise<{website: string|null, error: Error|null}>} - The result (website or error).
	 */
	async getSite(link, message) {
		let website = null;
		let error = null;
		
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
	 * Génère de nouvelles informations pour analyser un site MDN.
	 * @returns {Infos} - Les informations.
	 */
	newInfos() {
		return {
			compatibility:    null, // todo
			shortDescription: '',
			examples:         '',
			description:      '',
			lookAlso:         '',
			methods:          {},
			name:             '',
			parameters:       '',
			properties:       {},
			returnedValue:    '',
			specifications:   [], // todo
			staticMethods:    {},
			staticProperties: {},
			syntax:           '',
		};
	}
	
	/**
	 * Remplace une liste HTML par un objet contenant [nom : valeur].
	 * @param {HTMLUListElement} list - Le HTML.
	 * @returns {object} - L'objet.
	 */
	parseHTMLList(list) {
		const result = {};
		let e = [];
		
		if (list.tagName === 'DIV') {
			result.description = list.getElementsByTagName('p')?.item(0)?.innerHTML ?? null;
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
	 * @param {string} text - Le HTML.
	 * @returns {string} - Le texte reformatté.
	 */
	parseHTMLTagsToMarkdown(text = '') {
		if (!text || typeof text !== 'string') text = '';
		
		do {
			text = text
				.replace(/ ?(class|id|rel|title)="[^"]*?"/g, '')
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
				.replace(/<ul>\s*(<li>(.*?)<\/li>\s*)+<\/ul>/g, str => str.replace(/<\/?ul>\s*/g, '').replace(/<li>(.*?)<\/li>/g, ' • $1'))
				.replace(/&nbsp;/g, ' ')
				.replace(/&lt;/g, '<')
				.replace(/<h3>(.*?)<\/h3>/g, '> **$1**')
				.replace(/<div>([^]*?)<\/div>/g, '$1')
				.replace(/(\s*\n){2,}/g, '\n\n')
				.replace(/\s*```\s*/g, '```');
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
	 * @returns {string} - Le texte.
	 */
	parseParameters(list) {
		let result = '';
		for (let i = 0; i < list.childElementCount; i++) {
			const element = list.children[i];
			
			switch (element.tagName) {
				case 'DT':
					if (Array.from(element.children).find(e => e.tagName === 'H3')) break;
					
					const code = this.parseHTMLTagsToMarkdown(element.innerHTML);
					result += `\n**\`${code}\`** :`;
					break;
				
				case 'DD':
					result += `\n${element.innerHTML}\n`;
					break;
			}
		}
		
		return result;
	}
	
	/**
	 * Retourne les informations du dom en le parsant.
	 * @param {any} dom - Le DOM.
	 * @returns {{methods: {}, description: string, staticProperties: {}, shortDescription: string, specifications: *[], examples: string, name: string, staticMethods: {}, lookAlso: "", syntax: string, compatibility: null, parameters: string, returnedValue: string, properties: {}}} - Les informations.
	 */
	parseWebsiteInfos(dom) {
		const infos = this.newInfos();
		const article = dom.getElementById('wikiArticle');
		const header = dom.getElementsByClassName('documentation-page-header')[0];
		
		infos.name = header.getElementsByTagName('h1')[0].textContent;
		infos.shortDescription = article.getElementsByTagName('p')[0].innerHTML;
		
		let articleName = '';
		for (let i = 0; i < article.childElementCount; i++) {
			const element = article.children[i];
			
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
	
	async run(client, message, args) {
		super.run(client, message, args);
		
		this.emojis = {
			classes:          client.emojis.cache.get('742675256996659250'),
			clipboard:        '📋',
			constant:         client.emojis.cache.get('742675256963235979'),
			functions:        client.emojis.cache.get('742678946251931729'),
			methods:          client.emojis.cache.get('743086936004231168'),
			moreInfos:        client.emojis.cache.get('742678468759912518'),
			parameter:        client.emojis.cache.get('742675256686280716'),
			properties:       client.emojis.cache.get('742675256950521906'),
			staticProperties: client.emojis.cache.get('743087457721122908'),
			staticMethods:    client.emojis.cache.get('743087456751976508'),
			return:           '↩',
			waitEmoji:        client.emojis.cache.get('742682405906677840'),
		};
		const end = args.join(' ').replace('--debug', '').replace(/[\s.]/g, '/');
		const link = `${DocCommand.domain}/fr/docs/Web/JavaScript/Reference/Objets_globaux/${end}`;
		const result = await this.getSite(link, message);
		if (message.content.includes('--debug')) console.log(link);
		if (!args[0] || result.error?.message?.includes('Request failed with status code 404')) {
			if (!DocCommand.cache.has(DocCommand.nativeObjectsUrl)) DocCommand.cache.set(DocCommand.nativeObjectsUrl, await this.createDefaultListEmbed(message));
			const embed = DocCommand.cache.get(DocCommand.nativeObjectsUrl);
			
			if (args[0]) embed.setDescription(`Recherche de \`${args[0]}\` non trouvée, voici la liste des objets natifs disponibles :`);
			if (args[0] === 'eddy') embed.setThumbnail('https://tenor.com/view/thirsty-hamster-blowjob-suck-dick-gif-15709600'); // easter egg hehe
			return await super.send(embed);
		}
		if (result.error) return;
		
		const dom = new JSDOM(result.website.data, {runScripts: 'dangerously'}).window.document;
		const infos = this.parseWebsiteInfos(dom);
		const mainEmbed = await this.createEmbedFromMDNEmbedKey({
			type: 'infos',
			link: link,
		}, infos, message);
		
		const mainMessage = await super.send(mainEmbed);
		await mainMessage.react(this.emojis.clipboard);
		await mainMessage.react(this.emojis.moreInfos);
		if (JSON.stringify(infos.methods).slice(1, -1).length > 0) await mainMessage.react(this.emojis.methods);
		if (JSON.stringify(infos.properties).slice(1, -1).length > 0) await mainMessage.react(this.emojis.properties);
		if (JSON.stringify(infos.staticProperties).slice(1, -1).length > 0) await mainMessage.react(this.emojis.staticProperties);
		if (JSON.stringify(infos.staticMethods).slice(1, -1).length > 0) await mainMessage.react(this.emojis.staticMethods);
		await mainMessage.react(this.emojis.return);
		
		await this.createCollector(message, mainMessage, client, link, infos);
	}
	
	/**
	 * Transforme une liste de fields dans un objet en un embed propre.
	 * @param {object} object - La Liste de fields.
	 * @param {module:"discord.js".MessageEmbed} embed - L'embed.
	 * @param {string} link - Le lien de l'objet.
	 * @param {string} name - Le nom des fields.
	 * @retuns {void}
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
			
			if (object.description) embed.setDescription(this.parseHTMLTagsToMarkdown(object.description));
		}
		
		return embed;
	}
	
	/**
	 * Définit les informations de l'embed principal.
	 * @param {module:"discord.js".MessageEmbed} embed - L'embed.
	 * @param {Infos} infos - Les informations.
	 * @param {string} link - Le lien.
	 * @returns {MessageEmbed} - L'embed modifié.
	 */
	setMainInfos(embed, infos, link) {
		const type = this.typeOfObject(infos.name);
		const title = `${type === 'function' ?
		                 `${this.emojis.functions} Fonction` :
		                 type === 'class' ? `${this.emojis.classes} Classe` : type === 'namespace' ? `${this.emojis.constant} Namespace` : `${this.emojis.constant} Constante`} ${infos.name} :`;
		embed.setTitle(title);
		embed.setURL(link);
		embed.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.description)));
		if (infos.shortDescription) embed.addField('Description courte : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.shortDescription), 1024));
		if (infos.syntax) embed.addField('Syntaxe : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.syntax), 1024));
		if (infos.parameters) embed.addField(`${this.emojis.parameter} Paramètres : `, cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.parameters), 1024));
		if (infos.returnedValue) embed.addField('Valeur de retour : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.returnedValue), 1024));
		
		return embed;
	}
	
	/**
	 * Sets the informations for the moreInfos embed.
	 * @param {module:"discord.js".MessageEmbed} embed - L'embed.
	 * @param {Infos} infos - Les informations.
	 * @param {string} link - Le lien.
	 * @returns {MessageEmbed} - L'embed modifié.
	 */
	setMoreInfos(embed, infos, link) {
		embed.setTitle(`${this.emojis.moreInfos} Informations supplémentaires : `);
		if (infos.examples) {
			embed.setURL(link);
			embed.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.examples)));
		}
		if (infos.lookAlso) embed.addField('Voir aussi : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.lookAlso), 1024));
		
		return embed;
	}
	
	/**
	 * Renvoie un string suivant le type d'objet global qui est inscrit en paramètre.
	 * @param {string} name - Le nom de l'objet global.
	 * @returns {string} - Le résultat.
	 */
	typeOfObject(name) {
		const constants = {
			Infinity:   'Infinity',
			NaN:        'NaN',
			undefined:  'undefined',
			null:       'null',
			globalThis: 'globalThis',
		};
		
		const namespaces = {
			Intl: 'Intl',
		};
		
		return namespaces[name] ? 'namespace' : constants[name] ? 'constant' : name.charAt(0) === name.charAt(0).toUpperCase() ? 'class' : 'function';
	}
};
