'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src'); // eslint-disable-line no-unused-vars

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const sol = constructor => class extends constructor {
	/** @this {Token} */
	prependNewLine() {
		const {previousVisibleSibling = '', parentNode} = this;
		return (previousVisibleSibling || parentNode?.type !== 'root') && !String(previousVisibleSibling).endsWith('\n')
			? '\n'
			: '';
	}

	/** @this {Token} */
	appendNewLine() {
		return String(this.nextVisibleSibling ?? '').startsWith('\n') ? '' : '\n';
	}

	toString(ownLine = false) {
		return `${this.prependNewLine()}${super.toString()}${ownLine ? this.appendNewLine() : ''}`;
	}

	getPadding() {
		return this.prependNewLine().length;
	}

	text(ownLine = false) {
		return `${this.prependNewLine()}${super.text()}${ownLine ? this.appendNewLine() : ''}`;
	}
};

Parser.mixins.sol = __filename;
module.exports = sol;
