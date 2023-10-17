'use strict';
const lint_1 = require('../util/lint');
const {generateForSelf} = lint_1;
const fixed = require('../mixin/fixed');
const sol = require('../mixin/sol');
const Parser = require('../index');
const Token = require('.');
const SyntaxToken = require('./syntax');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
class HeadingToken extends sol(fixed(Token)) {
	/** @browser */
	type = 'heading';

	/**
	 * 标题层级
	 * @browser
	 */
	get level() {
		return Number(this.name);
	}

	/** @throws `RangeError` 标题层级应为 1 - 6 之间的整数 */
	set level(n) {
		this.setLevel(n);
	}

	/**
	 * 标题格式的等号
	 * @browser
	 */
	get #equals() {
		return '='.repeat(this.level);
	}

	/** 内部wikitext */
	get innerText() {
		return this.firstChild.text();
	}

	/**
	 * @browser
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.append(token, trail);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		const equals = this.#equals;
		return selector && this.matches(selector)
			? ''
			: `${this.prependNewLine()}${equals}${this.firstChild.toString(selector)}${equals}${this.lastChild.toString(selector)}`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		const equals = this.#equals;
		return `${this.prependNewLine()}${equals}${this.firstChild.text()}${equals}`;
	}

	/** @private */
	getPadding() {
		return super.getPadding() + this.level;
	}

	/** @private */
	getGaps() {
		return this.level;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			innerStr = String(this.firstChild);
		let refError;
		if (this.name === '1') {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (innerStr.startsWith('=') || innerStr.endsWith('=')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({...refError, message: Parser.msg('unbalanced "=" in a section header')});
		}
		if (this.closest('html-attrs, table-attrs')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({...refError, message: Parser.msg('section header in a HTML tag')});
		}
		return errors;
	}

	/** @override */
	cloneNode() {
		const [title, trail] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new HeadingToken(this.level, [], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(title);
			token.lastChild.safeReplaceWith(trail);
			return token;
		});
	}

	/**
	 * 设置标题层级
	 * @param n 标题层级
	 */
	setLevel(n) {
		if (!Number.isInteger(n)) {
			this.typeError('setLevel', 'Number');
		}
		const level = String(Math.min(Math.max(n, 1), 6));
		this.setAttribute('name', level);
	}

	/** 移除标题后的不可见内容 */
	removeTrail() {
		this.lastChild.replaceChildren();
	}
}
Parser.classes.HeadingToken = __filename;
module.exports = HeadingToken;
