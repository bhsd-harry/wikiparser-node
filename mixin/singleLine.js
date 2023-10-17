'use strict';
const Parser = require('../index');

/**
 * 不可包含换行符的类
 * @param constructor 基类
 */
const singleLine = constructor => {
	/** 不可包含换行符的类 */
	class SingleLineToken extends constructor {
		/** @override */
		toString(selector) {
			return super.toString(selector).replaceAll('\n', ' ');
		}

		/** @override */
		text() {
			return super.text().replaceAll('\n', ' ');
		}
	}
	Object.defineProperty(SingleLineToken, 'name', {value: `SingleLine${constructor.name}`});
	return SingleLineToken;
};
Parser.mixins.singleLine = __filename;
module.exports = singleLine;
