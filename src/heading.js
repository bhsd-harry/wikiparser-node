'use strict';

const fixedToken = require('../mixin/fixedToken'),
	sol = require('../mixin/sol'),
	Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
class HeadingToken extends fixedToken(sol(Token)) {
	type = 'heading';

	/** 内部wikitext */
	get innerText() {
		return this.firstElementChild.text();
	}

	/**
	 * @param {number} level 标题层级
	 * @param {string[]} input 标题文字
	 * @param {accum} accum
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('name', this.name).setAttribute('stage', 2);
		const SyntaxToken = require('./syntax');
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.append(token, trail);
	}

	/** @override */
	cloneNode() {
		const [title, trail] = this.cloneChildren(),
			token = Parser.run(() => new HeadingToken(Number(this.name), [], this.getAttribute('config')));
		token.firstElementChild.safeReplaceWith(title);
		token.lastElementChild.safeReplaceWith(trail);
		return token;
	}

	/**
	 * @override
	 * @this {{prependNewLine(): ''|'\n', appendNewLine(): ''|'\n'} & HeadingToken}
	 * @param {string} selector
	 */
	toString(selector) {
		const equals = '='.repeat(Number(this.name));
		return selector && this.matches(selector)
			? ''
			: `${this.prependNewLine()}${equals}${
				this.firstElementChild.toString(selector)
			}${equals}${this.lastElementChild.toString(selector)}${this.appendNewLine()}`;
	}

	/** @override */
	getPadding() {
		return super.getPadding() + Number(this.name);
	}

	/** @override */
	getGaps() {
		return Number(this.name);
	}

	/**
	 * @override
	 * @this {HeadingToken & {prependNewLine(): ''|'\n', appendNewLine(): ''|'\n'}}
	 * @returns {string}
	 */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${this.prependNewLine()}${equals}${this.firstElementChild.text()}${equals}${this.appendNewLine()}`;
	}

	/**
	 * 设置标题层级
	 * @param {number} n 标题层级
	 */
	setLevel(n) {
		if (typeof n !== 'number') {
			this.typeError('setLevel', 'Number');
		}
		n = Math.min(Math.max(n, 1), 6);
		this.setAttribute('name', String(n)).firstElementChild.setAttribute('name', this.name);
	}

	/** 移除标题后的不可见内容 */
	removeTrail() {
		this.lastElementChild.replaceChildren();
	}
}

Parser.classes.HeadingToken = __filename;
module.exports = HeadingToken;
