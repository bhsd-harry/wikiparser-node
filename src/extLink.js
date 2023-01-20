'use strict';

const Parser = require('..'),
	{noWrap, normalizeSpace} = require('../util/string'),
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

	/** @this {{firstChild: MagicLinkToken}} */
	set protocol(value) {
		this.firstChild.protocol = value;
	}

	/**
	 * 和内链保持一致
	 * @this {{firstChild: MagicLinkToken}}
	 */
	get link() {
		return this.firstChild.link;
	}

	set link(url) {
		this.setTarget(url);
	}

	/** 链接显示文字 */
	get innerText() {
		return this.childNodes.length > 1
			? this.lastChild.text()
			: `[${this.getRootNode().querySelectorAll('ext-link[childElementCount=1]').indexOf(this) + 1}]`;
	}

	/**
	 * @param {string} url 网址
	 * @param {string} space 空白字符
	 * @param {string} text 链接文字
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {MagicLinkToken: 0, Token: 1});
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum, {'Stage-7': ':', ConverterToken: ':'});
			inner.type = 'ext-link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.getAttribute('protectChildren')(0);
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		if (selector && this.matches(selector)) {
			return '';
		} else if (this.childNodes.length === 1) {
			return `[${super.toString(selector)}${this.#space}]`;
		}
		this.#correct();
		normalizeSpace(this.lastChild);
		return `[${super.toString(selector, this.#space)}]`;
	}

	/** @override */
	text() {
		normalizeSpace(this.childNodes[1]);
		return `[${super.text(' ')}]`;
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
	print() {
		const {length} = this;
		return super.print(length > 1 ? {pre: '[', sep: this.#space, post: ']'} : {pre: '[', post: `${this.#space}]`});
	}

	/** @override */
	cloneNode() {
		const [url, text] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ExtLinkToken(undefined, '', '', this.getAttribute('config'));
			token.firstChild.safeReplaceWith(url);
			if (text) {
				token.insertAt(text);
			}
			return token;
		});
	}

	/** 修正空白字符 */
	#correct() {
		if (!this.#space && this.childNodes.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(this.lastChild.text().replace(/&[lg]t;/u, '<'))
		) {
			this.#space = ' ';
		}
	}

	/**
	 * 获取网址
	 * @this {{firstChild: MagicLinkToken}}
	 */
	getUrl() {
		return this.firstChild.getUrl();
	}

	/**
	 * 设置链接目标
	 * @param {string|URL} url 网址
	 * @throws `SyntaxError` 非法的外链目标
	 */
	setTarget(url) {
		url = String(url);
		const root = Parser.parse(`[${url}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || extLink.type !== 'ext-link' || extLink.childNodes.length !== 1) {
			throw new SyntaxError(`非法的外链目标：${url}`);
		}
		const {firstChild} = extLink;
		extLink.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置链接显示文字
	 * @param {string} text 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(text) {
		text = String(text);
		const root = Parser.parse(`[//url ${text}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || extLink.type !== 'ext-link' || extLink.childNodes.length !== 2) {
			throw new SyntaxError(`非法的外链文字：${noWrap(text)}`);
		}
		const {lastChild} = extLink;
		if (this.childNodes.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}

Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
