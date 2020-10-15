/**
 * Coupe le texte en ajoutant '...' si il est plus long que la maxLength.
 * @param {string} text - Texte.
 * @param {number} maxLength - Longueur maximale.
 * @returns {string} - Texte coupé.
 */
function formatWithRange(text, maxLength) {
	return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
}

/**
 * Ajoute le(s) zéro(s) manquant(s) à un nombre avec une taille maximale cherchée.
 * @param {String|number} number - Le nombre.
 * @param {number} size - La taille voulue.
 * @returns {string} - Le résultat.
 */
function addMissingZeros(number, size) {
	return number.toString().length < size ? '0'.repeat(size - number.toString().length) + number : number;
}

/**
 * Formatte le pattern pour pouvoir ajouter des éléments d'une date, un peu comme moments mais ne fonctionne qu'avec :
 *
 *  • Année (yyyy)
 *  • Mois (MM)
 *  • Jours (jj)
 *  • Heures (hh)
 *  • Minutes (mm)
 *  • Secondes (ss)
 *  • Millisecondes (SSSS).
 *
 * @example
 * const pattern = "Il est hh heure et mm minutes.";
 * const result = parseDate(pattern);
 *
 * console.log(result); // Il est 01 heure et 50 minutes.
 *
 * @param {string} pattern - Le patterne demandé.
 * @param {Date} [date = new Date()] - La date.
 * @param {boolean} [removeOneDay = false] - Si on doit supprimer un jour ({@link parseRelativeDate}).
 * @returns {string} - La date reformatté.
 */
function parseDate(pattern, date = new Date(), removeOneDay = false) {
	let result = pattern;
	result = result.replace(/y{4}/gi, date.getFullYear().toString())
	               .replace(/M{2}/g, addMissingZeros(date.getMonth() + 1, 2))
	               .replace(/[d|j]{2}/gi, addMissingZeros(removeOneDay ? date.getDate() - 1 : date.getDate(), 2))
	               .replace(/h{2}/gi, addMissingZeros(date.getHours(), 2))
	               .replace(/m{2}/g, addMissingZeros(date.getMinutes(), 2))
	               .replace(/s{2}/g, addMissingZeros(date.getSeconds(), 2))
	               .replace(/S{4}/g, addMissingZeros(date.getMilliseconds(), 2));
	
	return result;
}

/**
 * Fait la même chose que {@link parseDate} mais avec une date relative.
 * @see parseDate
 *
 * @param {string} pattern - Le patterne.
 * @param {Date} [relativeDate = new Date()] - La date relative.
 * @returns {string} - La date relative reformatée.
 */
function parseRelativeDate(pattern, relativeDate = new Date()) {
	relativeDate.setFullYear(relativeDate.getFullYear() - 1900);
	return parseDate(pattern, relativeDate, true);
}

/**
 * Utile pour la commande "remind" par exemple.
 * @example
 * const result = getTime("Je veux attendre 5h");
 * console.log(result);
 * {
 *   type: 'h',
 *   value: 18000000 (1000 * 60 * 60 * 5)
 * }
 *
 * @param {String|String[]} args - Texte.
 * @returns {{type: string, value: number}} - Retourne un objet contenant le type de temps et le nombre de millisecondes.
 */
function getTime(args) {
	function setTime(text, time) {
		if (['d', 'j', 'jour', 'jours'].some(s => text.endsWith(s))) {
			time.value = 1000 * 60 * 60 * 24 * parseInt(text.slice(0, text.length - 1));
			time.type = 'd';
		} else if (['h', 'heure', 'heures', 'hour', 'hours'].some(s => text.endsWith(s))) {
			time.value = 1000 * 60 * 60 * parseInt(text.slice(0, text.length - 1));
			time.type = 'h';
		} else if (['m', 'minute', 'minutes'].some(s => text.endsWith(s))) {
			time.value = 1000 * 60 * parseInt(text.slice(0, text.length - 1));
			time.type = 'm';
		} else if (['s', 'seconde', 'secondes', 'second', 'seconds'].some(s => text.endsWith(s))) {
			time.value = 1000 * parseInt(text.slice(0, text.length - 1));
			time.type = 's';
		}
	}
	
	const time = {
		value: 0,
		type:  '',
	};
	
	const argsArray = args.toLowerCase().trim().split(/ +/g);
	const text = typeof args === 'string' ? argsArray[argsArray.length - 1] : args[args.length - 1];
	setTime(text, time);
	
	if (time.value === 0) setTime(args[0], time);
	return time;
}

/**
 * Permet de transformer un gros nombre en KB/MB/GB
 * @param {number} bytes - Le nombre d'octets
 * @returns {string} - Le résultat.
 */
function formatByteSize(bytes) {
	return bytes < 1000 ? `${bytes} octets` : bytes < 1000000 ? `${(bytes / 1000).toFixed(3)} KB` : bytes < 1000000000 ? `${(bytes / 1000000).toFixed(3)} MB` : `${(bytes / 1000000000).toFixed(3)} GB`;
}

module.exports = {
	getTime,
	parseDate,
	addMissingZeros,
	formatWithRange,
	parseRelativeDate,
	formatByteSize,
};
