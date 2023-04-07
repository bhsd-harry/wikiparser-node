'use strict';
const lint_1 = require('../../util/lint');
const {generateForSelf} = lint_1;
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** 扩展标签内的纯文字Token */
class NowikiToken extends NowikiBaseToken {
	/** @browser */
	type = 'ext-inner';

	/**
	 * @override
	 * @browser
	 * @param start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const {name} = this;
		return (name === 'templatestyles' || name === 'section') && String(this)
			? [generateForSelf(this, {start}, Parser.msg('nothing should be in <$1>', name))]
			: super.lint(start);
	}
}
Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
