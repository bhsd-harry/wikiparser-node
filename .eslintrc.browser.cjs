'use strict';

const config = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	overrides: [
		{
			files: [
				'extensions/dist/gh-page.js',
				'extensions/dist/codejar.js',
			],
			rules: {
				'es-x/no-dynamic-import': 0,
			},
		},
		{
			files: 'extensions/dist/gh-page.js',
			parserOptions: {
				sourceType: 'module',
			},
		},
	],
};
