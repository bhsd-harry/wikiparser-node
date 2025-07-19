'use strict';

const config = require('@bhsd/code-standard/eslintrc.dist.cjs');

module.exports = {
	...config,
	overrides: [
		{
			files: 'extensions/dist/gh-page.js',
			parserOptions: {
				sourceType: 'module',
			},
		},
	],
};
