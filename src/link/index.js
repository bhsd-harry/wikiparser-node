'use strict';

/** @typedef {import('../../lib/text')} AstText */
/** @typedef {import('../../lib/title')} Title */

const {generateForChild} = require('../../util/lint'),
	{noWrap} = require('../../util/string'),
	{undo} = require('../../util/debug'),
	Parser = require('../..'),
	Token = require('..'),
	AtomToken = require('../atom');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	/** @type {import('.').linkType} */ type = 'link';
	#bracket = true;
	#delimiter;
	#fragment;
	#encoded = false;

	/**
	 * 完整链接，和FileToken保持一致
	 * @returns {Title}
	 */
	get link() {
		return this.#getTitle();
	}

	/**
	 * @this {import('.')}
	 * @param {string|Title} link 链接目标
	 */
	set link(link) {
		this.setTarget(link);
	}

	/** 是否链接到自身 */
	get selfLink() {
		const {title, fragment} = this.#getTitle();
		return !title && Boolean(fragment);
	}

	/** @this {this & import('.')} */
	set selfLink(selfLink) {
		if (selfLink === true) {
			this.asSelfLink();
		}
	}

	/** fragment */
	get fragment() {
		return this.#getTitle().fragment;
	}

	/** @this {this & import('.')} */
	set fragment(fragment) {
		this.#setFragment(fragment);
	}

	/** interwiki */
	get interwiki() {
		return this.#getTitle().interwiki;
	}

	/** @this {this & import('.')} */
	set interwiki(interwiki) {
		if (typeof interwiki !== 'string') {
			this.typeError('set interwiki', 'String');
		}
		const {prefix, main, fragment} = this.#getTitle(),
			link = `${interwiki}:${prefix}${main}${fragment === undefined ? '' : `#${fragment}`}`;
		if (interwiki && !this.isInterwiki(link)) {
			throw new RangeError(`${interwiki} 不是合法的跨维基前缀!`);
		}
		this.setTarget(link);
	}

	/** 链接显示文字 */
	get innerText() {
		if (this.type === 'link') {
			return this.length > 1
				? this.lastChild.text()
				: this.firstChild.text().replace(/^\s*:/u, '');
		}
		return undefined;
	}

	/**
	 * @param {string} link 链接标题
	 * @param {string} linkText 链接显示文字
	 * @param {Token[]} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, linkText, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(undefined, config, true, accum, {
			AtomToken: 0, Token: 1,
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
			'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum, {
				'Stage-5': ':', ConverterToken: ':',
			});
			inner.type = 'link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.#delimiter = delimiter;
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @throws `Error` 非法的内链目标
	 * @throws `Error` 不可更改命名空间
	 */
	afterBuild() {
		const titleObj = this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
		this.setAttribute('name', titleObj.title);
		this.#fragment = titleObj.fragment;
		this.#encoded = titleObj.encoded;
		if (this.#delimiter?.includes('\0')) {
			this.#delimiter = this.getAttribute('buildFromStr')(this.#delimiter, 'string');
		}
		const /** @type {import('../../lib/node').AstListener} */ linkListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					{title, interwiki, ns, valid, fragment, encoded} = this.normalizeTitle(name, 0, false, true, true);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的内链目标：${name}`);
				} else if (this.type === 'category' && (interwiki || ns !== 14)
					|| this.type === 'file' && (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(`${this.type === 'file' ? '文件' : '分类'}链接不可更改命名空间：${name}`);
				} else if (this.type === 'link' && !interwiki && (ns === 6 || ns === 14) && name.trim()[0] !== ':') {
					const {firstChild} = prevTarget;
					if (firstChild.type === 'text') {
						firstChild.insertData(0, ':');
					} else {
						prevTarget.prepend(':');
					}
				}
				this.setAttribute('name', title);
				this.#fragment = fragment;
				this.#encoded = encoded;
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {import('../../lib/node').TokenAttribute<T>} value 属性值
	 */
	setAttribute(key, value) {
		if (key === 'bracket') {
			this.#bracket = Boolean(value);
			return this;
		}
		return super.setAttribute(key, value);
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		const str = super.toString(selector, this.#delimiter);
		return this.#bracket && !(selector && this.matches(selector)) ? `[[${str}]]` : str;
	}

	/** @override */
	text() {
		const str = super.text('|');
		return this.#bracket ? `[[${str}]]` : str;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/** @override */
	getGaps() {
		return this.#delimiter.length;
	}

	/** @override */
	print() {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}

	/**
	 * @override
	 * @this {this & import('.')}
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			{childNodes: [target, linkText], type: linkType} = this;
		let rect;
		if (linkType === 'link' && target.childNodes.some(({type}) => type === 'template')) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'template in an internal link target', 'warning'));
		}
		if (this.#encoded) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'unnecessary URL encoding in an internal link'));
		}
		if (linkType === 'link' && linkText?.childNodes?.some(
			/** @param {AstText} child */ ({type, data}) => type === 'text' && data.includes('|'),
		)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(linkText, rect, 'additional "|" in the link text', 'warning'));
		} else if (linkType !== 'link' && this.#fragment !== undefined) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'useless fragment'));
		}
		return errors;
	}

	/** 生成Title对象 */
	#getTitle() {
		return this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
	}

	/**
	 * @override
	 * @this {import('.') & {constructor: typeof import('.')}}
	 */
	cloneNode() {
		const [link, ...linkText] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor('', undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(link);
			token.append(...linkText);
			token.afterBuild();
			return /** @type {this} */ (token);
		});
	}

	/**
	 * 设置链接目标
	 * @this {import('.')}
	 * @param {string|Title} link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		link = String(link);
		if (this.type === 'link' && !/^\s*[:#]/u.test(link)) {
			link = `:${link}`;
		}
		const root = Parser.parse(`[[${link}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: wikiLink} = /** @type {Token & {firstChild: import('.')}} */ (root),
			{type, firstChild, length: linkLength} = wikiLink;
		if (length !== 1 || type !== this.type || linkLength !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${link}`);
		}
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置跨语言链接
	 * @this {import('.')}
	 * @param {string} lang 语言前缀
	 * @param {string} link 页面标题
	 * @throws `SyntaxError` 非法的跨语言链接
	 */
	setLangLink(lang, link) {
		if (typeof lang !== 'string') {
			this.typeError('setLangLink', 'String');
		}
		link = String(link).trim();
		const [char] = link;
		if (char === '#') {
			throw new SyntaxError('跨语言链接不能仅为fragment！');
		} else if (char === ':') {
			link = link.slice(1);
		}
		const root = Parser.parse(`[[${lang}:${link}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: wikiLink} = /** @type {Token & {firstChild: import('.')}} */ (root),
			{type, length: linkLength, interwiki, firstChild} = wikiLink;
		if (length !== 1 || type !== 'link' || linkLength !== 1 || interwiki !== lang.toLowerCase()) {
			throw new SyntaxError(`非法的跨语言链接目标：${lang}:${link}`);
		}
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @this {import('.')}
	 * @param {string} fragment fragment
	 * @param {boolean} page 是否是其他页面
	 * @throws `SyntaxError` 非法的fragment
	 */
	#setFragment(fragment, page = true) {
		fragment &&= String(fragment).replace(/[<>[\]#|=]/gu, p => encodeURIComponent(p));
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`[[${page ? `:${this.name}` : ''}${
				fragment === undefined ? '' : `#${fragment}`
			}]]`, include, 6, config),
			{length, firstChild: wikiLink} = /** @type {Token & {firstChild: import('.')}} */ (root),
			{type, length: linkLength, firstChild} = wikiLink;
		if (length !== 1 || type !== 'link' || linkLength !== 1) {
			throw new SyntaxError(`非法的 fragment：${fragment}`);
		} else if (page) {
			Parser.warn(`${this.constructor.name}.setFragment 方法会同时规范化页面名！`);
		}
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @this {this & import('.')}
	 * @param {string} fragment fragment
	 */
	setFragment(fragment) {
		this.#setFragment(fragment);
	}

	/**
	 * 修改为到自身的链接
	 * @this {this & import('.')}
	 * @param {string} fragment fragment
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment = this.fragment) {
		fragment &&= String(fragment);
		if (!fragment?.trim()) {
			throw new RangeError(`${this.constructor.name}.asSelfLink 方法必须指定非空的 fragment！`);
		}
		this.#setFragment(fragment, false);
	}

	/**
	 * 设置链接显示文字
	 * @this {import('.')}
	 * @param {string} linkText 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(linkText = '') {
		linkText = String(linkText);
		let lastChild;
		const config = this.getAttribute('config');
		if (linkText) {
			const root = Parser.parse(`[[${
					this.type === 'category' ? 'Category:' : ''
				}L|${linkText}]]`, this.getAttribute('include'), 6, config),
				{length, firstChild: wikiLink} = root;
			if (length !== 1 || wikiLink.type !== this.type || wikiLink.length !== 2) {
				throw new SyntaxError(`非法的${this.type === 'link' ? '内链文字' : '分类关键字'}：${noWrap(linkText)}`);
			}
			({lastChild} = /** @type {import('.')} */ (wikiLink));
		} else {
			lastChild = Parser.run(() => new Token('', config));
			lastChild.setAttribute('stage', 7).type = 'link-text';
		}
		if (this.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
	}

	/**
	 * 自动生成管道符后的链接文字
	 * @this {import('.')}
	 * @throws `Error` 带有"#"或"%"时不可用
	 */
	pipeTrick() {
		const linkText = this.firstChild.text();
		if (linkText.includes('#') || linkText.includes('%')) {
			throw new Error('Pipe trick 不能用于带有"#"或"%"的场合！');
		}
		const m1 = /^:?(?:[ \w\x80-\xFF-]+:)?([^(]+)\(.+\)$/u.exec(linkText);
		if (m1) {
			this.setLinkText(m1[1].trim());
			return;
		}
		const m2 = /^:?(?:[ \w\x80-\xFF-]+:)?([^（]+)（.+）$/u.exec(linkText);
		if (m2) {
			this.setLinkText(m2[1].trim());
			return;
		}
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.+?)(?:(?<!\()\(.+\))?(?:, |，|، )./u.exec(linkText);
		if (m3) {
			this.setLinkText(m3[1].trim());
			return;
		}
		this.setLinkText(linkText);
	}
}

Parser.classes.LinkToken = __filename;
module.exports = LinkToken;
