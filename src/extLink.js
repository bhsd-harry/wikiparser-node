'use strict';
const string_1 = require('../util/string');
const {noWrap, normalizeSpace} = string_1;
const Parser = require('../index');
const Token = require('.');
const MagicLinkToken = require('./magicLink');

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
class ExtLinkToken extends Token {
	/** @browser */
	type = 'ext-link';
	/** @browser */
	#space;

	/** 协议 */
	get protocol() {
		return this.firstChild.protocol;
	}

	set protocol(value) {
		this.firstChild.protocol = value;
	}

	/** 和内链保持一致 */
	get link() {
		return this.firstChild.link;
	}

	set link(url) {
		this.setTarget(url);
	}

	/** 链接显示文字 */
	get innerText() {
		return this.length > 1
			? this.lastChild.text()
			: `[${this.getRootNode().querySelectorAll('ext-link[childElementCount=1]').indexOf(this) + 1}]`;
	}

	/**
	 * @browser
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url, space = '', text = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			MagicLinkToken: 0, Token: 1,
		});
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum, {
				'Stage-7': ':', ConverterToken: ':',
			});
			inner.type = 'ext-link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		if (selector && this.matches(selector)) {
			return '';
		} else if (this.length === 1) {
			return `[${super.toString(selector)}${this.#space}]`;
		}
		this.#correct();
		normalizeSpace(this.lastChild);
		return `[${super.toString(selector, this.#space)}]`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		normalizeSpace(this.childNodes[1]);
		return `[${super.text(' ')}]`;
	}

	/** @private */
	getPadding() {
		return 1;
	}

	/** @private */
	getGaps() {
		this.#correct();
		return this.#space.length;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print(this.length > 1 ? {pre: '[', sep: this.#space, post: ']'} : {pre: '[', post: `${this.#space}]`});
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
		if (!this.#space && this.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(this.lastChild.text().replace(/&[lg]t;/u, '<'))) {
			this.#space = ' ';
		}
	}

	/** 获取网址 */
	getUrl() {
		return this.firstChild.getUrl();
	}

	/**
	 * 设置链接目标
	 * @param url 网址
	 * @throws `SyntaxError` 非法的外链目标
	 */
	setTarget(url) {
		const strUrl = String(url),
			root = Parser.parse(`[${strUrl}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || extLink.type !== 'ext-link' || extLink.length !== 1) {
			throw new SyntaxError(`非法的外链目标：${strUrl}`);
		}
		const {firstChild} = extLink;
		extLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置链接显示文字
	 * @param str 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(str) {
		const root = Parser.parse(`[//url ${str}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || extLink.type !== 'ext-link' || extLink.length !== 2) {
			throw new SyntaxError(`非法的外链文字：${noWrap(str)}`);
		}
		const {lastChild} = extLink;
		if (this.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}
Parser.classes.ExtLinkToken = __filename;
module.exports = ExtLinkToken;
