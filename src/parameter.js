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
		return this.firstChild.childNodes.length === 0;
	}

	/**
	 * @param {string|number} key 参数名
	 * @param {string} value 参数值
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('./atom');
		const keyToken = new AtomToken(typeof key === 'number' ? undefined : key, 'parameter-key', config, accum, {
				'Stage-2': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @override */
	afterBuild() {
		if (!this.anon) {
			const TranscludeToken = require('./transclude');
			const name = this.firstChild.text().trim(),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode && parentNode instanceof TranscludeToken) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		return this;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString(selector) {
		return this.anon
			? this.lastChild.toString(selector)
			: super.toString(selector, '=');
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return this.anon ? this.lastChild.text() : super.text('=');
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
