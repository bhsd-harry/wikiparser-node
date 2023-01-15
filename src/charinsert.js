'use strict';

const Parser = require('..'),
	Token = require('.'),
	HasNowikiToken = require('./hasNowiki');

/**
 * `<charinsert>`
 * @classdesc `{childNodes: [...HasNowikiToken]}`
 */
class CharinsertToken extends Token {
	type = 'ext-inner';
	name = 'charinsert';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {HasNowikiToken: ':'});
		this.append(...wikitext.split('\n').map(str => new HasNowikiToken(str, 'charinsert-line', config, accum)));
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({sep: '\n'});
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new CharinsertToken(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * 获取某一行的插入选项
	 * @param {number|HasNowikiToken} child 行号或子节点
	 */
	getLineItems(child) {
		if (Number.isInteger(child)) {
			child = this.childNodes.at(child);
		}
		if (!(child instanceof HasNowikiToken)) {
			this.typeError('getLineItems', 'Number', 'HasNowikiToken');
		}
		const entities = {'\t': '&#9;', '\r': '&#12;', ' ': '&#32;'};
		return String(child).replaceAll(
			/<nowiki>(.+?)<\/nowiki>/giu,
			/** @type {function(...string): string} */ (_, inner) => inner.replaceAll(/[\t\r ]/gu, s => entities[s]),
		).split(/\s/u).filter(Boolean)
			.map(item => {
				const parts = item.split('+');
				if (parts.length === 1) {
					return parts[0];
				}
				return parts[0] ? parts.slice(0, 2) : '+';
			});
	}

	/** 获取所有插入选项 */
	getAllItems() {
		return this.childNodes.flatMap(child => this.getLineItems(child));
	}

	/** @override */
	text() {
		return this.childNodes.map(
			child => this.getLineItems(child).map(str => Array.isArray(str) ? str.join('+') : str).join(' '),
		).join('\n');
	}
}

Parser.classes.CharinsertToken = __filename;
module.exports = CharinsertToken;
