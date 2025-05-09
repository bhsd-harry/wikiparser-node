'use strict';

const config = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	extends: [
		'plugin:es-x/restrict-to-es2016',
	],
	rules: {
		'es-x/no-global-this': 0,
		'es-x/no-malformed-template-literals': 0,
		'es-x/no-object-entries': 0,
		'es-x/no-object-getownpropertydescriptors': 0,
		'es-x/no-object-values': 0,
		'es-x/no-regexp-unicode-property-escapes': 0,
		'es-x/no-string-prototype-padstart-padend': 0,
	},
};
