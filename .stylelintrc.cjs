'use strict';

const config = require('@bhsd/common/stylelintrc.cjs');

module.exports = {
	...config,
	ignoreFiles: ['extensions/ui.css'],
};
