'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [AtomToken, Token]}`
 */
class ParameterToken extends Token {
	type = 'parameter';

	/** 是否是匿名参数 */
	get anon() {
		return this.firstElementChild.childNodes.length === 0;
	}

	/**
	 * @param {string|number} key 参数名
	 * @param {string} value 参数值
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('./atom');
		const keyToken = new AtomToken(typeof key === 'number' ? undefined : key, 'parameter-key', config, accum),
			token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	/** @override */
	getGaps() {
		return this.anon ? 0 : 1;
	}

	/** @override */
	print() {
		return super.print({sep: this.anon ? '' : '='});
	}
}

module.exports = ParameterToken;
