'use strict';
const hidden = require('../../mixin/hidden');
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
class NoincludeToken extends hidden(NowikiBaseToken) {
	/** @browser */
	type = 'noinclude';

	/**
	 * @override
	 * @param str 新文本
	 * @throws `Error` 不可更改
	 */
	setText(str) {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s.*)?\/?>$/isu.test(String(this))) {
			throw new Error(`${this.constructor.name} 不可更改文字内容！`);
		}
		return super.setText(str);
	}
}
Parser.classes.NoincludeToken = __filename;
module.exports = NoincludeToken;
