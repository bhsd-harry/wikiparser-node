'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const hidden = constructor => class extends constructor {
	get hidden() {
		return true;
	}

	text() {
		return '';
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
