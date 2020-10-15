const logTypes = {
	debug: '35',
	log:   '37',
	info:  '34',
	warn:  '33',
	error: '31',
};

const tags = {
	owner_only:       'Seulement disponible aux gérants du bot.',
	guild_only:       'Seulement disponible sur serveur.',
	dm_only:          'Seulement disponible en messages privés.',
	nsfw_only:        'Seulement disponible dans un salon NSFW.',
	guild_owner_only: 'Seulement disponible pour le propriétaire du serveur.',
	help_command:     'Commande d\'aide.',
	prefix_command:   'Commande des préfixes.',
	hidden:           'Cachée.',
	wip:              'Non finie (potentiellement instable).',
};

const categories = {
	development: 'Développement',
	owner:       'Privé',
	utils:       'Utilitaires',
};

const superscripts = {
	' ': ' ',
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'+': '⁺',
	'-': '⁻',
	'a': 'ᵃ',
	'b': 'ᵇ',
	'c': 'ᶜ',
	'd': 'ᵈ',
	'e': 'ᵉ',
	'f': 'ᶠ',
	'g': 'ᵍ',
	'h': 'ʰ',
	'i': 'ⁱ',
	'j': 'ʲ',
	'k': 'ᵏ',
	'l': 'ˡ',
	'm': 'ᵐ',
	'n': 'ⁿ',
	'o': 'ᵒ',
	'p': 'ᵖ',
	'r': 'ʳ',
	's': 'ˢ',
	't': 'ᵗ',
	'u': 'ᵘ',
	'v': 'ᵛ',
	'w': 'ʷ',
	'x': 'ˣ',
	'y': 'ʸ',
	'z': 'ᶻ',
};

module.exports = {
	categories,
	logTypes,
	tags,
	superscripts,
};
