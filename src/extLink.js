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

	/**
	 * 协议
	 * @this {{firstChild: MagicLinkToken}}
	 */
	get protocol() {
		return this.firstChild.protocol;
	}

	/**
	 * @this {{firstChild: MagicLinkToken}}
	 * @param {string} value 协议
	 */
	set protocol(value) {
		this.firstChild.protocol = value;
	}

	/**
	 * @param {string} url 网址
	 * @param {string} space 空白字符
	 * @param {string} text 链接文字
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

	/** @override */
	cloneNode() {
		const [url, text] = this.cloneChildren(),
			token = Parser.run(() => new ExtLinkToken(undefined, '', '', this.getAttribute('config')));
		token.firstElementChild.safeReplaceWith(url);
		if (text) {
			token.appendChild(text);
		}
		return token;
	}

	/** 修正空白字符 */
	#correct() {
		if (!this.#space && this.childNodes.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(this.lastElementChild.text().replace(/&[lg]t;/u, '<'))
		) {
			this.#space = ' ';
		}
	}

	/** @override */
	toString() {
		if (this.childNodes.length === 1) {
			return `[${super.toString()}${this.#space}]`;
		}
		this.#correct();
		normalizeSpace(this.lastElementChild);
		return `[${super.toString(this.#space)}]`;
	}

	/** @override */
	getPadding() {
		return 1;
	}

	/** @override */
	getGaps() {
		this.#correct();
		return this.#space.length;
	}

	/** @override */
	text() {
		normalizeSpace(this.children[1]);
		return `[${super.text(' ')}]`;
	}

	/**
	 * 获取网址
	 * @this {{firstElementChild: MagicLinkToken}}
	 */
	getUrl() {
		return this.firstElementChild.getUrl();
	}

	/**
	 * 设置链接目标
	 * @param {string|URL} url 网址
	 * @throws `SyntaxError` 非法的外链目标
	 */
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

	/**
	 * 设置链接显示文字
	 * @param {string} text 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
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

	/** 链接显示文字 */
	get innerText() {
		return this.childNodes.length > 1
			? this.lastElementChild.text()
			: `[${this.getRootNode().querySelectorAll('ext-link[childElementCount=1]').indexOf(this) + 1}]`;
	}
}

Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
