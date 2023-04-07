'use strict';

/** @typedef {import('../src')} Token */

const Parser = require('../index');

/**
 * 只能位于行首的类
 * @param {new (...args: any) => Token} Constructor 基类
 */
const sol = Constructor => class SolToken extends Constructor {
	/** 是否可以视为root节点 */
	#isRoot() {
		const {parentNode, type} = this;
		return parentNode?.type === 'root'
			|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem';
	}

	/** 在前方插入newline */
	prependNewLine() {
		return (this.previousVisibleSibling || !this.#isRoot()) && !String(this.previousVisibleSibling).endsWith('\n')
			? '\n'
			: '';
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `${this.prependNewLine()}${super.toString(selector)}`;
	}

	/** @override */
	getPadding() {
		return this.prependNewLine().length;
	}

	/** @override */
	text() {
		return `${this.prependNewLine()}${super.text()}`;
	}
};

Parser.mixins.sol = __filename;
module.exports = sol;
