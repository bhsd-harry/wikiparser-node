'use strict';

const {text} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, Token, ...HiddenToken]}`
 */
class ArgToken extends Token {
	type = 'arg';

	/**
	 * @param {string[]} parts
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		for (const [i, part] of parts.entries()) {
			if (i === 0 || i > 1) {
				const AtomToken = i === 0 ? require('./atom') : require('./atom/hidden'),
					token = new AtomToken(part, `arg-${i === 0 ? 'name' : 'redundant'}`, config, accum);
				this.appendChild(token);
			} else {
				const token = new Token(part, config, true, accum);
				token.type = 'arg-default';
				this.appendChild(token.setAttribute('stage', 2));
			}
		}
	}

	toString() {
		return `{{{${super.toString('|')}}}}`;
	}

	print() {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @returns {string} */
	text() {
		return `{{{${text(this.children.slice(0, 2), '|')}}}}`;
	}
}

module.exports = ArgToken;
