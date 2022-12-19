'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const hidden = ct => class extends ct {
	text() {
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
