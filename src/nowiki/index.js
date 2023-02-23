'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
class NowikiToken extends Token {
	type = 'ext-inner';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const {type, name} = this;
		return type === 'ext-inner' && (name === 'templatestyles' || name === 'section') && String(this)
			? [generateForSelf(this, {start}, `<${name}>标签内不应有任何内容`)]
			: super.lint(start);
	}
}

module.exports = NowikiToken;
