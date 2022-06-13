'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const hidden = constructor => class extends constructor {
	text() {
		return '';
	}

	plain() {
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
