'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} ct
 * @returns {T}
 */
const hidden = ct => class extends ct {
	text() { // eslint-disable-line class-methods-use-this
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
