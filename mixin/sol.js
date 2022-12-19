'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const sol = ct => class extends ct {
	/** @this {Token} */
	prependNewLine() {
		const {previousVisibleSibling = '', parentNode} = this;
		return (previousVisibleSibling || parentNode?.type !== 'root') && !String(previousVisibleSibling).endsWith('\n')
			? '\n'
			: '';
	}

	/** @this {Token} */
	appendNewLine() {
		const {nextVisibleSibling = '', parentNode} = this;
		return (nextVisibleSibling || parentNode?.type !== 'root') && !String(nextVisibleSibling ?? '').startsWith('\n')
			? '\n'
			: '';
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
