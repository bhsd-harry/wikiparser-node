'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{fixToken} = require('./util');

class ListToken extends fixToken(Token) {
	type = 'list';

	/**
	 * @param {string} syntax
	 * @param {?string|number|Token|(string|Token)[]} content
	 * @param {Object<string, any>} config
	 * @param {Token} parent
	 * @param {Token[]} accum
	 */
	constructor(syntax, content, config = require(Token.config), parent = null, accum = [], isTable = false) {
		if (/[^:;#*]/.test(syntax)) {
			throw new RangeError('List语法只接受":"、";"、"#"或"*"！');
		}
		super(new AtomToken(syntax, 'list-syntax'), config, true, parent, accum, ['AtomToken', 'Token']);
		const inner = new Token(content, config, true, this, accum);
		inner.type = 'list-inner';
		inner.set('stage', isTable ? 4 : 10);
		this.lists = new Set(syntax.split(''));
		this.seal();
	}

	isDt() {
		return this.$children[0].contains(';');
	}

	idDd() {
		return this.$children[0].contains(':');
	}

	isOl() {
		return this.$children[0].contains('#');
	}

	isUl() {
		return this.$children[0].contains('*');
	}
}

Token.classes.ListToken = ListToken;

module.exports = ListToken;
