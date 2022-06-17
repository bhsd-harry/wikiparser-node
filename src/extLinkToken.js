'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('./token');

/**
 * 外链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class ExtLinkToken extends Token {
	type = 'ext-link';
	#space;

	/**
	 * @param {string} url
	 * @param {string} space
	 * @param {string} text
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('./atomToken'),
			target = new AtomToken(url, 'ext-link-url', accum, {'Stage-1': ':', '!ExtToken': ''});
		this.appendChild(target);
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'ext-link-text';
			this.appendChild(inner.setAttribute('stage', 8));
		}
		this.protectChildren(0);
	}

	toString() {
		return `[${super.toString(this.#space)}]`;
	}

	getPadding() {
		return 1;
	}

	getGaps() {
		return this.#space.length;
	}

	text() {
		return `[${super.text(this.#space)}]`;
	}

	plain() {
		return this.childElementCount === 1 ? [] : this.lastElementChild.plain();
	}

	/**
	 * @this {ExtLinkToken & {firstChild: Token}}
	 * @param {string} url
	 */
	setTarget(url) {
		url = String(url);
		const root = new Token(`[${url}]`, this.getAttribute('config')).parse(8),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的外链目标：${url}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * @this {ExtLinkToken & {lastChild: Token}}
	 * @param {string} text
	 */
	setText(text) {
		text = String(text);
		const root = new Token(`[//url ${text}]`, this.getAttribute('config')).parse(8),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的外链文字：${text.replaceAll('\n', '\\n')}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childElementCount === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}

Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
