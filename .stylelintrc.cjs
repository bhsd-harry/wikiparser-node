'use strict';

const config = require('@bhsd/code-standard/stylelintrc.cjs');

module.exports = {
	...config,
	ignoreFiles: [
		'extensions/ui.css',
	],
};
