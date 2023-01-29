'use strict';

const {extUrlChar} = require('../util/string'),
	{generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
class ParameterToken extends Token {
	type = 'parameter';

	/** 是否是匿名参数 */
	get anon() {
		return this.firstChild.length === 0;
	}

	/**
	 * @param {string|number} key 参数名
	 * @param {string} value 参数值
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, true, accum, {
			}),
			token = new Token(value, config, true, accum);
		keyToken.type = 'parameter-key';
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @override */
	afterBuild() {
		if (!this.anon) {
			const TranscludeToken = require('./transclude');
			const name = String(this.firstChild).replace(/<!--.*?-->/gu, '')
					.replace(/^[ \t\n\0\v]+|[^ \t\n\0\v][ \t\n\0\v]+$/gu, ''),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode instanceof TranscludeToken) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
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

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			{firstChild} = this,
			link = new RegExp(`https?://${extUrlChar}$`, 'iu')
				.exec(String(firstChild).replace(/<!--.*?-->/gu, ''))?.[0];
		if (link && new URL(link).search) {
			const e = generateForChild(firstChild, {token: this, start}, '匿名参数中未转义的查询参数');
			errors.push({
				...e,
				startIndex: e.endIndex,
				endIndex: e.endIndex + 1,
				startLine: e.endLine,
				startCol: e.endCol,
				endCol: e.endCol + 1,
			});
		}
		return errors;
	}
}

module.exports = ParameterToken;
