'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<noinclude>`和`</noinclude>`，不可进行任何更改
 * @classdesc `{childNodes: [string]}`
 */
class NoincludeToken extends hidden(NowikiToken) {
	type = 'noinclude';

	/**
	 * @override
	 * @param {string} str 新文本
	 * @throws `Error` 不可更改
	 */
	setText(str) {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s.*)?\/?>$/isu.test(this.toString())) {
			throw new Error(`${this.constructor.name} 不可更改文字内容！`);
		}
		return super.setText(str);
	}
}

Parser.classes.NoincludeToken = __filename;
module.exports = NoincludeToken;
