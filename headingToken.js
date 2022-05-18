'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{removeComment, typeError, fixToken} = require('./util');

/** @content Token, Token */
class HeadingToken extends fixToken(Token) {
	type = 'heading';
	name;

	/**
	 * @param {number} level
	 * @param {(string|Token|(string|Token)[])[]} input
	 * @param {Object<string, any>} config
	 * @param {Token[]} accum
	 */
	constructor(level, input, config = require(Token.config), accum = []) {
		if (removeComment(input[1].toString())) {
			throw new RangeError('标题行行末只能包含注释和空白字符！');
		}
		super(null, config, true, null, accum, ['Token', 'AtomToken']);
		this.name = String(level);
		const token = new Token(input[0], config, true, this, accum);
		token.type = 'heading-title';
		token.name = this.name;
		token.set('stage', 2);
		new AtomToken(input[1], 'heading-trail', this, accum, ['String', 'CommentToken']);
		this.seal();
	}

	toString() {
		const equals = '='.repeat(this.name);
		return `${equals}${this.$children[0]}${equals}${this.$children[1]}`;
	}

	/** @param {string|number|Token|TokenCollection} str */
	update(str) {
		const /** @type {[Token]} */ [title] = this;
		title.content(str);
		return this;
	}

	/** @param {number} n */
	level(n) {
		if (typeof n !== 'number') {
			typeError('Number');
		}
		n = Math.min(Math.max(n, 1), 6);
		this.name = String(n);
		return this;
	}
}

Token.classes.HeadingToken = HeadingToken;

module.exports = HeadingToken;
