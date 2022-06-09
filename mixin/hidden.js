'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const hidden = constructor => class extends constructor {
	text() { // eslint-disable-line class-methods-use-this
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
