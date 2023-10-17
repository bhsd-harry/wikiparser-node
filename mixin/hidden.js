'use strict';
const Parser = require('../index');

/**
 * 解析后不可见的类
 * @param constructor 基类
 */
const hidden = constructor => {
	/** 解析后不可见的类 */
	class AnyHiddenToken extends constructor {
		static hidden = true;

		/** 没有可见部分 */
		text() {
			return '';
		}
	}
	return AnyHiddenToken;
};
Parser.mixins.hidden = __filename;
module.exports = hidden;
