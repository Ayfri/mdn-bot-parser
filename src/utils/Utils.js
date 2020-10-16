const {superscripts} = require('../constants.js');
const {owners} = require('../../assets/jsons/config.json');

/**
 * Indique si l'id l'user est owner.
 * @param {string} userId - Id à tester.
 * @returns {boolean} - Si il est owner.
 */
function isOwner(userId) {
	return owners.includes(userId);
}

/**
 * Retourne la clé via la propriété de l'objet.
 * @param {object} object - L'object.
 * @param {any} value - La valeur.
 * @returns {any} - La clé.
 */
function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
}

/**
 * Retourne une valeur aléatoire de l'array mis en argument.
 * @param {Array} array - Un tableau.
 * @returns {*} - Une des valeurs random.
 */
function random(array) {
	return array[Math.floor(Math.random() * array.length)];
}

/**
 * Coupe le texte si il dépasse la {@link length}.
 * @param {string} text - Le texte.
 * @param {number} [length = 2000] - La longueur du texte max.
 * @returns {string} Le texte recoupé.
 */
function cutTextIfTooLong(text, length = 2000) {
	if (text.length > length) {
		text = `${text.substring(0, length - 3)}...`;
	}

	return text;
}

/**
 * Convertis le texte normal en texte supercscript.
 * @param {string} x - Texte.
 * @returns {string} - Le texte en superscript.
 */
function toSup(x) {
	return x
		.split('')
		.map(function (c) {
			return c in superscripts ? superscripts[c] : c;
		})
		.join('');
}

module.exports = {
	getKeyByValue,
	isOwner,
	random,
	cutTextIfTooLong,
	toSup,
};
