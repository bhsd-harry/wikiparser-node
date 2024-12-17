'use strict';

const config = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	extends: [
		'plugin:es-x/restrict-to-es2016',
	],
};
