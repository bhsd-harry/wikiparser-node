'use strict';

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const hidden = constructor => class extends constructor {
	text() {
		return '';
	}
};

module.exports = hidden;
