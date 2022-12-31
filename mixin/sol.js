'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src');

/**
 * 只能位于行首的类
 * @template T
 * @param {T} ct 基类
 * @returns {T}
 */
const sol = ct => class extends ct {
	/**
	 * 在前方插入newline
	 * @this {Token}
	 */
	prependNewLine() {
		const {previousVisibleSibling = '', parentNode} = this;
		return (previousVisibleSibling || parentNode?.type !== 'root') && !String(previousVisibleSibling).endsWith('\n')
			? '\n'
			: '';
	}

	/**
	 * 在后方插入newline
	 * @this {Token}
	 */
	appendNewLine() {
		const {nextVisibleSibling = '', parentNode} = this;
		return (nextVisibleSibling || parentNode?.type !== 'root') && !String(nextVisibleSibling ?? '').startsWith('\n')
			? '\n'
			: '';
	}

	/**
	 * 还原为wikitext
	 * @param {boolean} ownLine 是否独占一行
	 */
	toString(ownLine = false) {
		return `${this.prependNewLine()}${super.toString()}${ownLine ? this.appendNewLine() : ''}`;
	}

	/** 获取padding */
	getPadding() {
		return this.prependNewLine().length;
	}

	/**
	 * 可见部分
	 * @param {booean} ownLine 是否独占一行
	 */
	text(ownLine = false) {
		return `${this.prependNewLine()}${super.text()}${ownLine ? this.appendNewLine() : ''}`;
	}
};

Parser.mixins.sol = __filename;
module.exports = sol;
