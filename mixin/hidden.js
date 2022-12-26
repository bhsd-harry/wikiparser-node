'use strict';

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

module.exports = hidden;
