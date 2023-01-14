'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	AstText = require('../../lib/text');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
class NowikiToken extends fixedToken(Token) {
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
	lint(start = 0) {
		const {type, name} = this;
		return type === 'ext-inner' && (name === 'templatestyles' || name === 'section')
			? [generateForSelf(this, this.getRootNode().posFromIndex(start), `<${name}>标签内不应有任何内容`)]
			: super.lint(start);
	}

	/**
	 * @override
	 * @this {NowikiToken & {firstChild: AstText, constructor: typeof NowikiToken}}
	 */
	cloneNode() {
		const {constructor, firstChild: {data}, type} = this,
			token = Parser.run(() => new constructor(data, this.getAttribute('config')));
		token.type = type;
		return token;
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 */
	setText(str) {
		return super.setText(str, 0);
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
