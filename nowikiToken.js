'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{numberToString, typeError, fixToken} = require('./util');

/** @content string */
class NowikiToken extends fixToken(AtomToken) {
	/**
	 * @param {string|number|Token|TokenCollection} wikitext
	 * @param {Token} parent
	 * @param {Token[]} accum
	 */
	constructor(wikitext, parent = null, accum = []) {
		if (!['string', 'number'].includes(typeof wikitext)
			&& !(wikitext instanceof Token) && !(wikitext instanceof Token.$.TokenCollection)
		) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		super(String(wikitext), 'ext-inner', parent, accum);
		this.unremovableChild(0);
	}

	/** @param {string|number} str */
	content(str) {
		str = numberToString(str);
		if (typeof str !== 'string') {
			typeError('String', 'Number');
		}
		this.$children[0] = str;
		return this;
	}
}

Token.classes.NowikiToken = NowikiToken;

module.exports = NowikiToken;
