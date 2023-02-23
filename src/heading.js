'use strict';

const {generateForSelf} = require('../util/lint'),
	fixedToken = require('../mixin/fixedToken'),
	sol = require('../mixin/sol'),
	Parser = require('..'),
	Token = require('.'),
	SyntaxToken = require('./syntax');

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
		token.setAttribute('name', this.name);
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.append(token, trail);
	}

	/**
	 * @override
	 * @this {{prependNewLine(): ''|'\n'} & HeadingToken}
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		const equals = '='.repeat(Number(this.name));
		return selector && this.matches(selector)
			? ''
			: `${this.prependNewLine()}${equals}${
				this.firstChild.toString(selector)
			}${equals}${this.lastChild.toString(selector)}`;
	}

	/**
	 * @override
	 * @this {HeadingToken & {prependNewLine(): ''|'\n'}}
	 * @returns {string}
	 */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${this.prependNewLine()}${equals}${this.firstChild.text()}${equals}`;
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
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			innerText = String(this.firstChild);
		let refError;
		if (this.name === '1') {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (innerText[0] === '=' || innerText.at(-1) === '=') {
			refError ||= generateForSelf(this, {start}, '');
			errors.push({...refError, message: '段落标题中不平衡的"="'});
		}
		if (this.closest('html-attrs, table-attrs')) {
			refError ||= generateForSelf(this, {start}, '');
			errors.push({...refError, message: 'HTML标签属性中的段落标题'});
		}
		return errors;
	}

	/** @override */
	cloneNode() {
		const [title, trail] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new HeadingToken(Number(this.name), [], this.getAttribute('config'));
			token.firsthild.safeReplaceWith(title);
			token.lastChild.safeReplaceWith(trail);
			return token;
		});
	}

	/**
	 * 设置标题层级
	 * @param {number} n 标题层级
	 */
	setLevel(n) {
		if (!Number.isInteger(n)) {
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
