'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [AtomToken, Token]}`
 */
class ParameterToken extends Token {
	type = 'parameter';
	anon;

	/**
	 * @param {string|number} key
	 * @param {string} value
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.anon = typeof key === 'number';
		const AtomToken = require('./atom'),
			keyToken = new AtomToken(this.anon ? undefined : key, 'parameter-key', config, accum),
			token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @returns {string} */
	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	print() {
		return this.anon ? `<span class="parameter">${this.lastElementChild.print()}</span>` : super.print({sep: '='});
	}

	/** @returns {string} */
	text() {
		return this.anon ? this.lastElementChild.text() : super.text('=');
	}

	getValue() {
		const value = this.lastElementChild.text();
		return this.anon && this.parentNode?.matches('template, magic-word#invoke') ? value : value.trim();
	}
}

module.exports = ParameterToken;
