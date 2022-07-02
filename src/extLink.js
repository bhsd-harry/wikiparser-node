'use strict';

const {typeError} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 外链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class ExtLinkToken extends Token {
	type = 'ext-link';
	#space;
	#protocolRegex;

	get protocol() {
		return this.firstElementChild.text().match(this.#protocolRegex)?.[0];
	}
	/** @param {string} value */
	set protocol(value) {
		if (typeof value !== 'string') {
			typeError(this, 'protocol', 'String');
		}
		if (!new RegExp(`${this.#protocolRegex.source}$`, 'i').test(value)) {
			throw new RangeError(`非法的外链协议：${value}`);
		}
		const {firstElementChild} = this;
		firstElementChild.replaceChildren(firstElementChild.text().replace(this.#protocolRegex, value));
	}

	/**
	 * @param {string} url
	 * @param {string} space
	 * @param {string} text
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('./atom'),
			target = new AtomToken(url, 'ext-link-url', config, accum, {'Stage-1': ':', '!ExtToken': ''});
		this.appendChild(target);
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'ext-link-text';
			this.appendChild(inner.setAttribute('stage', 8));
		}
		this.protectChildren(0);
		this.#protocolRegex = new RegExp(`^(?:${config.protocol}|//)`, 'i');
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
		return `[${super.toString(this.#space)}]`;
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

	getUrl() {
		const url = this.firstElementChild.text();
		try {
			return new URL(url);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${url}`);
			}
			throw e;
		}
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
