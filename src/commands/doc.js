const Command = require('../entities/Command.js');
const {categories, tags} = require('../constants.js');
const axios = require('axios');
const {cutTextIfTooLong, toSup} = require('../utils/Utils.js');
const {JSDOM} = require('jsdom');
const {MessageEmbed} = require('discord.js');

module.exports = class DocCommand extends Command {
	static domain = 'https://developer.mozilla.org';
	static logo = 'https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png';
	
	constructor() {
		super({
			name       : 'doc',
			description: 'Donne des informations sur une classe/méthode/propriété.',
			usage      : 'doc String\ndoc Array.prototype.sort\ndoc Math.cos\ndoc Map.prototype.size',
			category   : categories.development,
			tags       : [tags.prefix_command],
		});
	}
	
	/**
	 *
	 * @param client
	 * @param message
	 * @param {String[]} args
	 * @returns {void}
	 */
	async run(client, message, args) {
		super.run(client, message, args);
		if ( !args[0]) args[0] = 'Boolean';
		
		const waitEmoji = client.emojis.cache.get('567125834197106689');
		const link = `${DocCommand.domain}/fr/docs/Web/JavaScript/Reference/Objets_globaux/${args[0]}`;
		
		let website;
		try {
			website = await axios.get(link);
			await message.react(waitEmoji);
		} catch (e) {
			if (e.message.includes('Request failed with status code 404')) {
				return super.send('Pas trouvé. (temporaire)');
			}
		}
		
		const dom = new JSDOM(website.data, {runScripts: 'dangerously'}).window.document;
		const article = dom.getElementById('wikiArticle');
		const header = dom.getElementsByClassName('documentation-page-header')[0];
		
		const infos = {
			compatibility   : null, // pas fait encore
			shortDescription: '',
			examples        : '',
			description     : '',
			lookAlso        : [],
			methods         : {},
			name            : '',
			parameters      : '',
			properties      : {},
			returnedValue   : '',
			specifications  : [], // pas fait encore
			staticMethods   : {},
			staticProperties: {},
			syntax          : '',
		};
		
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
				
				if(!element.textContent) continue;
				
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
		
		const informations = new MessageEmbed();
		const moreInfos = new MessageEmbed();
		const staticProperties = new MessageEmbed();
		const staticMethods = new MessageEmbed();
		const properties = new MessageEmbed();
		const methods = new MessageEmbed();
		
		informations.setAuthor(`${infos.name.charAt(0) === infos.name.charAt(0).toUpperCase() ? 'Classe' : 'Fonction'} ${infos.name} :`, DocCommand.logo, link);
		informations.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.description)));
		informations.setFooter("Cliquez sur le titre de cet embed pour aller sur la documentation !");
		if (infos.shortDescription) informations.addField('Description courte : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.shortDescription), 1024));
		if (infos.syntax) informations.addField('Syntaxe : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.syntax), 1024));
		if (infos.parameters) informations.addField('Paramètres : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.parameters), 1024));
		if (infos.returnedValue) informations.addField('Valeur de retour : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.returnedValue), 1024));
		
		moreInfos.setAuthor('Informations supplémentaires : ', DocCommand.logo, link);
		if (infos.examples) {
			moreInfos.setTitle('Exemples :');
			moreInfos.setDescription(cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.examples)));
		}
		if (infos.lookAlso) moreInfos.addField('Voir aussi : ', cutTextIfTooLong(this.parseHTMLTagsToMarkdown(infos.lookAlso)));
		
		super.send(informations);
		super.send(moreInfos);
		
		this.parseFields(infos.staticProperties, staticProperties, link, 'Propriétés statiques');
		this.parseFields(infos.staticMethods, staticMethods, link, 'Méthodes statiques');
		this.parseFields(infos.properties, properties, link, 'Propriétés');
		this.parseFields(infos.methods, methods, link, 'Méthodes');
		
		if (Object.keys(infos.staticProperties).length > 0) super.send(staticProperties);
		if (Object.keys(infos.staticMethods).length > 0) super.send(staticMethods);
		if (Object.keys(infos.properties).length > 0) super.send(properties);
		if (Object.keys(infos.methods).length > 0) super.send(methods);
		
		await message.reactions.cache.find(r => r.emoji.id === waitEmoji.id).users.remove(client.user.id);
		
		console.log(infos);
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
	parseFields(object, embed, link, name) {
		if (Object.keys(object).length > 0) {
			embed.setAuthor(`${name} :`, DocCommand.logo, link);
			object = Object.fromEntries(Object.entries(object).slice(0, 25));
			
			for (const property in object) {
				if ( !object.hasOwnProperty(property) || !object[property] || property === 'description') continue;
				embed.addField(property, this.parseHTMLTagsToMarkdown(object[property]));
			}
			
			if (object.description) {
				embed.setDescription(this.parseHTMLTagsToMarkdown(object.description));
			}
		}
	}
	
	/**
	 * Remplace les tags HTML de formats pour les renvoyer en markdown Discord.
	 * @param {String} text - Le HTML.
	 * @returns {string} - Le texte reformatté.
	 * @private
	 */
	parseHTMLTagsToMarkdown(text) {
		if ( !text) text = '';
		
		do {
			text = text.replace(/ ?(class|id|rel)="[^"]*?"/g, '')
			           .replace(/<a\s*href="(.+?)">(.+?)<\/a>/, (str, link, content) => `[${content}](${(link.startsWith('http') ? link : DocCommand.domain + link)})`)
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
		} while (/<(.+?) ((href|class|id)=".+?")*>.+?<\/(\1)>/m.test(text));
		
		return text;
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
};


const nickames = {
	'190853049915408384': 'Si putain',
	'615878027074600986': 'here',
	'386893236498857985': 'Sucez-moi le chibre de Provence',
	'352176756922253321': 'L\'absentéiste',
	'609069199536685096': 'Jean-mimi',
	'383344172712722432': 'Monster (en hibernation)',
	'147675693902331914': 'You password is Incorrect',
	'460904946838274098': 'Érythème',
	'690831638623420438': 'T\'as changé ma vie Kevin',
	'301712153327566850': 'I\'m CapiCode🌴',
	'576470460481667086': 'everyone',
	'627207317825257472': 'coin coin',
	'406558555093729281': 'nyan cat',
	'686305799483818016': 'Wolf',
	'280497242714931202': 'yui',
	'276060004262477825': 'Bug Ambulant',
	'709815588016357429': 'gomme',
	'471991012030677003': '<div>Austrian</div>',
	'532231329950072835': 'antoine du 01',
	'329624064333447168': 'golem de fer',
	'216214448203890688': 'Goulag d\'yfri',
	'290462006543253505': 'DB-phob',
	'272676235946098688': 'Lucas',
	'346967289322799105': 'Eddy',
	'462632958910529546': 'il aime le Java o_O',
	'182414082022834176': 'Ahkrin',
};