'use strict';

const Parser = require('..');

/**
 * 不可包含换行符的类
 * @template {Function} T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const singleLine = Constructor => {
	const SingleLineConstructor = class extends Constructor {
		/**
		 * @override
		 * @param {string} selector
		 */
		toString(selector) {
			return super.toString(selector).replaceAll('\n', ' ');
		}

		/** @override */
		text() {
			return super.text().replaceAll('\n', ' ');
		}
	};
	Object.defineProperty(SingleLineConstructor, 'name', {value: `SingleLine${Constructor.name}`});
	return SingleLineConstructor;
};

Parser.mixins.singleLine = __filename;
module.exports = singleLine;
