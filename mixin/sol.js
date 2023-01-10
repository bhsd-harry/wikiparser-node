'use strict';

const Parser = require('..'),
	Token = require('../src');

/**
 * 只能位于行首的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const sol = Constructor => class SolToken extends Constructor {
	/**
	 * 是否可以视为root节点
	 * @this {Token}
	 * @param {boolean} includeHeading 是否包括HeadingToken
	 */
	#isRoot(includeHeading) {
		const {parentNode, type} = this;
		return parentNode?.type === 'root'
			|| parentNode?.type === 'ext-inner' && parentNode?.name === 'poem'
				&& (includeHeading || type !== 'heading');
	}

	/**
	 * 在前方插入newline
	 * @this {SolToken & Token}
	 */
	prependNewLine() {
		return (this.previousVisibleSibling || !this.#isRoot()) && String(this.previousVisibleSibling).at(-1) !== '\n'
			? '\n'
			: '';
	}

	/**
	 * 在后方插入newline
	 * @this {SolToken & Token}
	 */
	appendNewLine() {
		return (this.nextVisibleSibling || !this.#isRoot(true)) && String(this.nextVisibleSibling ?? '')[0] !== '\n'
			? '\n'
			: '';
	}

	/**
	 * 还原为wikitext
	 * @param {string} selector
	 * @param {boolean} ownLine 是否独占一行
	 */
	toString(selector, ownLine) {
		return `${this.prependNewLine()}${super.toString(selector)}${ownLine ? this.appendNewLine() : ''}`;
	}

	/** 获取padding */
	getPadding() {
		return this.prependNewLine().length;
	}

	/**
	 * 可见部分
	 * @param {booean} ownLine 是否独占一行
	 */
	text(ownLine) {
		return `${this.prependNewLine()}${super.text()}${ownLine ? this.appendNewLine() : ''}`;
	}
};

Parser.mixins.sol = __filename;
module.exports = sol;
