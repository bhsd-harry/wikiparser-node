'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	MagicLinkToken = require('./magicLink');

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
class ExtLinkToken extends Token {
	type = 'ext-link';
	#space;

	/** @this {{firstChild: MagicLinkToken}} */
	get protocol() {
		return this.firstChild.protocol;
	}
	/** @this {{firstChild: MagicLinkToken}} */
	set protocol(value) {
		this.firstChild.protocol = value;
	}

	/**
	 * @param {string} url
	 * @param {string} space
	 * @param {string} text
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		this.appendChild(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'ext-link-text';
			this.appendChild(inner.setAttribute('stage', 8));
		}
		this.protectChildren(0);
	}

	cloneNode() {
		const [url, text] = this.cloneChildren(),
			token = Parser.run(() => new ExtLinkToken(undefined, '', '', this.getAttribute('config')));
		token.firstElementChild.safeReplaceWith(url);
		if (text) {
			token.appendChild(text);
		}
	}

	toString() {
		return `[${this.firstElementChild.toString()}${this.#space}${this.children[1]?.toString() ?? ''}]`;
	}

	getPadding() {
		return 1;
	}

	getGaps() {
		return this.#space.length;
	}

	text() {
		return `[${super.text(' ')}]`;
	}

	/**
	 * @returns {[number, string][]}
	 * @complexity `n`
	 */
	plain() {
		return this.childElementCount === 1 ? [] : this.lastElementChild.plain();
	}

	/** @this {ExtLinkToken & {firstElementChild: MagicLinkToken}} */
	getUrl() {
		return this.firstElementChild.getUrl();
	}

	/** @param {string|URL} url */
	setTarget(url) {
		url = String(url);
		const root = Parser.parse(`[${url}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的外链目标：${url}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstElementChild.safeReplaceWith(firstChild);
	}

	/** @param {string} text  */
	setLinkText(text) {
		text = String(text);
		const root = Parser.parse(`[//url ${text}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的外链文字：${text.replaceAll('\n', '\\n')}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childElementCount === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastElementChild.replaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}

Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
