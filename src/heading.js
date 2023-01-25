'use strict';

const {generateForSelf} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	SyntaxToken = require('./syntax');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
class HeadingToken extends Token {
	type = 'heading';

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
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
		});
		this.append(token, trail);
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString(selector) {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstChild.toString()}${equals}${this.lastChild.toString()}`;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstChild.text()}${equals}`;
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
		const errors = super.lint(start),
			innerText = String(this.firstChild);
		let refError;
		if (this.name === '1') {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (innerText[0] === '=' || innerText.endsWith('=')) {
			refError ||= generateForSelf(this, {start}, '');
			errors.push({...refError, message: '段落标题中不平衡的"="'});
		}
		if (this.closest('html-attrs, table-attrs')) {
			refError ||= generateForSelf(this, {start}, '');
			errors.push({...refError, message: 'HTML标签属性中的段落标题'});
		}
		return errors;
	}
}

module.exports = HeadingToken;
