'use strict';

const {generateForSelf} = require('../util/lint'),
	fixedToken = require('../mixin/fixedToken'),
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
		return this.firstChild.text();
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
		const [title, trail] = this.cloneChildNodes(),
			token = Parser.run(() => new HeadingToken(Number(this.name), [], this.getAttribute('config')));
		token.firsthild.safeReplaceWith(title);
		token.lastChild.safeReplaceWith(trail);
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
				this.firstChild.toString(selector)
			}${equals}${this.lastChild.toString(selector)}${this.appendNewLine()}`;
	}

	/** @override */
	getPadding() {
		return super.getPadding() + Number(this.name);
	}

	/** @override */
	getGaps() {
		return Number(this.name);
	}

	/** @override */
	print() {
		const equals = '='.repeat(Number(this.name));
		return super.print({pre: equals, sep: equals});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (this.name === '1') {
			errors.push(generateForSelf(this, this.getRootNode().posFromIndex(start), '<h1>'));
		}
		return errors;
	}

	/**
	 * @override
	 * @this {HeadingToken & {prependNewLine(): ''|'\n', appendNewLine(): ''|'\n'}}
	 * @returns {string}
	 */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${this.prependNewLine()}${equals}${this.firstChild.text()}${equals}${this.appendNewLine()}`;
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
		this.setAttribute('name', String(n)).firstChild.setAttribute('name', this.name);
	}

	/** 移除标题后的不可见内容 */
	removeTrail() {
		this.lastChild.replaceChildren();
	}
}

Parser.classes.HeadingToken = __filename;
module.exports = HeadingToken;
