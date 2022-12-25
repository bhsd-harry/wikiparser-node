'use strict';

const {noWrap, normalizeSpace} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
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
			const inner = new Token(text, config, true, accum, {'Stage-7': ':', ConverterToken: ':'});
			inner.type = 'ext-link-text';
			this.appendChild(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
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
		return token;
	}

	#correct() {
		if (!this.#space && this.childNodes.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\x00-\x20\x7f\p{Zs}\ufffd]/u.test(this.lastElementChild.text().replace(/&[lg]t;/, '<'))
		) {
			this.#space = ' ';
		}
	}

	toString() {
		this.#correct();
		return `[${this.firstElementChild.toString()}${this.#space}${normalizeSpace(this.children[1])}]`;
	}

	getPadding() {
		this.#correct();
		return 1;
	}

	getGaps() {
		this.#correct();
		return this.#space.length;
	}

	text() {
		return `[${super.text(' ').replaceAll('\n', ' ')}]`;
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
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childNodes.length !== 1) {
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
		if (length !== 1 || firstElementChild?.type !== 'ext-link' || firstElementChild.childNodes.length !== 2) {
			throw new SyntaxError(`非法的外链文字：${noWrap(text)}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childNodes.length === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastElementChild.safeReplaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}

Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
