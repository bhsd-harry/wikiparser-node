'use strict';
const Parser = require('../index');

/**
 * 只能位于行首的类
 * @param constructor 基类
 */
const sol = constructor => {
	/** 只能位于行首的类 */
	class SolToken extends constructor {
		/** 是否可以视为root节点 */
		#isRoot() {
			const {parentNode, type} = this;
			return parentNode?.type === 'root'
				|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem';
		}

		/** 在前方插入newline */
		prependNewLine() {
			const {previousVisibleSibling} = this;
			return (previousVisibleSibling ?? !this.#isRoot()) && !String(previousVisibleSibling).endsWith('\n')
				? '\n'
				: '';
		}

		/** @override */
		toString(selector) {
			return selector && this.matches(selector)
				? ''
				: `${this.prependNewLine()}${super.toString(selector)}`;
		}

		/** @override */
		getPadding() {
			return this.prependNewLine().length;
		}

		/** @override */
		text() {
			return `${this.prependNewLine()}${super.text()}`;
		}
	}
	return SolToken;
};
Parser.mixins.sol = __filename;
module.exports = sol;
