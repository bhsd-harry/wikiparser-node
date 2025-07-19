'use strict';

const config = require('@bhsd/code-standard/eslintrc.dist.cjs');

module.exports = {
	...config,
	extends: [
		'plugin:es-x/restrict-to-es2017',
	],
	rules: {
		'es-x/no-global-this': 0,
		'es-x/no-regexp-unicode-property-escapes': 0,
	},
};
