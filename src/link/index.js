'use strict';

const {generateForChild} = require('../../util/lint'),
	{noWrap} = require('../../util/string'),
	{undo} = require('../../util/debug'),
	Parser = require('../..'),
	Title = require('../../lib/title'),
	AstText = require('../../lib/text'),
	Token = require('..'),
	AtomToken = require('../atom');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';
	#bracket = true;
	#delimiter;

	/** 完整链接，和FileToken保持一致 */
	get link() {
		return String(this.#getTitle());
	}

	set link(link) {
		this.setTarget(link);
	}

	/** 是否链接到自身 */
	get selfLink() {
		return !this.#getTitle().title;
	}

	set selfLink(selfLink) {
		if (selfLink === true) {
			this.asSelfLink();
		}
	}

	/** fragment */
	get fragment() {
		return this.#getTitle().fragment;
	}

	set fragment(fragment) {
		this.setFragment(fragment);
	}

	/** interwiki */
	get interwiki() {
		return this.#getTitle().interwiki;
	}

	set interwiki(interwiki) {
		if (typeof interwiki !== 'string') {
			this.typeError('set interwiki', 'String');
		}
		const {prefix, main, fragment} = this.#getTitle(),
			link = `${interwiki}:${prefix}${main}${fragment && '#'}${fragment}`;
		if (interwiki && !this.isInterwiki(link)) {
			throw new RangeError(`${interwiki} 不是合法的跨维基前缀!`);
		}
		this.setTarget(link);
	}

	/** 链接显示文字 */
	get innerText() {
		if (this.type === 'link') {
			return this.childNodes.length > 1
				? this.lastChild.text()
				: this.firstChild.text().replace(/^\s*:/u, '');
		}
		return undefined;
	}

	/**
	 * @param {string} link 链接标题
	 * @param {string|undefined} linkText 链接显示文字
	 * @param {Title} title 链接标题对象
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, linkText, title, config = Parser.getConfig(), accum = [], delimiter = '|') {
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
		this.getAttribute('protectChildren')(0);
	}

	/**
	 * @override
	 * @throws `Error` 非法的内链目标
	 * @throws `Error` 不可更改命名空间
	 */
	afterBuild() {
		this.setAttribute('name', this.normalizeTitle(this.firstChild.text()).title);
		if (this.#delimiter?.includes('\0')) {
			this.#delimiter = this.getAttribute('buildFromStr')(this.#delimiter).map(String).join('');
		}
		const /** @type {AstListener} */ linkListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					{title, interwiki, ns, valid} = this.normalizeTitle(name);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的内链目标：${name}`);
				} else if (this.type === 'category' && (interwiki || ns !== 14)
					|| this.type === 'file' && (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(`${this.type === 'file' ? '文件' : '分类'}链接不可更改命名空间：${name}`);
				} else if (this.type === 'link' && !interwiki && (ns === 6 || ns === 14) && name.trim()[0] !== ':') {
					const /** @type {{firstChild: AstText}} */ {firstChild} = prevTarget;
					if (firstChild.type === 'text') {
						firstChild.insertData(0, ':');
					} else {
						prevTarget.prepend(':');
					}
				}
				this.setAttribute('name', title);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
		return this;
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
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
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			{childNodes: [, linkText]} = this;
		if (linkText?.childNodes?.some(
			/** @param {AstText} */ ({type, data}) => type === 'text' && data.includes('|'),
		)) {
			errors.push(generateForChild(linkText, {token: this, start}, '链接文本中多余的"|"'));
		}
		return errors;
	}

	/** 生成Title对象 */
	#getTitle() {
		return this.normalizeTitle(this.firstChild.text());
	}

	/**
	 * @override
	 * @this {LinkToken & {constructor: typeof LinkToken}}
	 */
	cloneNode() {
		const [link, ...linkText] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor('', undefined, this.#getTitle(), this.getAttribute('config'));
			token.firstChild.safeReplaceWith(link);
			token.append(...linkText);
			return token.afterBuild();
		});
	}

	/**
	 * 设置链接目标
	 * @param {string} link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		link = String(link);
		if (this.type === 'link' && !/^\s*[:#]/u.test(link)) {
			link = `:${link}`;
		}
		const root = Parser.parse(`[[${link}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: wikiLink} = root,
			{type, firstChild, length: linkLength} = wikiLink;
		if (length !== 1 || type !== this.type || linkLength !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${link}`);
		}
		wikiLink.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置跨语言链接
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
			/** @type {Token & {firstChild: LinkToken}} */ {length, firstChild: wikiLink} = root,
			{type, length: linkLength, interwiki, firstChild} = wikiLink;
		if (length !== 1 || type !== 'link' || linkLength !== 1 || interwiki !== lang.toLowerCase()) {
			throw new SyntaxError(`非法的跨语言链接目标：${lang}:${link}`);
		}
		wikiLink.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @param {string} fragment fragment
	 * @param {boolean} page 是否是其他页面
	 * @throws `SyntaxError` 非法的fragment
	 */
	#setFragment(fragment, page = true) {
		fragment = String(fragment).replaceAll(/[<>[\]#|=]/gu, p => encodeURIComponent(p));
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`[[${page ? `:${this.name}` : ''}#${fragment}]]`, include, 6, config),
			{length, firstChild: wikiLink} = root,
			{type, length: linkLength, firstChild} = wikiLink;
		if (length !== 1 || type !== 'link' || linkLength !== 1) {
			throw new SyntaxError(`非法的 fragment：${fragment}`);
		} else if (page) {
			Parser.warn(`${this.constructor.name}.setFragment 方法会同时规范化页面名！`);
		}
		wikiLink.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @param {string} fragment fragment
	 */
	setFragment(fragment) {
		this.#setFragment(fragment);
	}

	/**
	 * 修改为到自身的链接
	 * @param {string} fragment fragment
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment = this.fragment) {
		fragment = String(fragment);
		if (!fragment.trim()) {
			throw new RangeError(`${this.constructor.name}.asSelfLink 方法必须指定非空的 fragment！`);
		}
		this.#setFragment(fragment, false);
	}

	/**
	 * 设置链接显示文字
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
			if (length !== 1 || wikiLink.type !== this.type || wikiLink.childNodes.length !== 2) {
				throw new SyntaxError(`非法的${this.type === 'link' ? '内链文字' : '分类关键字'}：${noWrap(linkText)}`);
			}
			({lastChild} = wikiLink);
		} else {
			lastChild = Parser.run(() => new Token('', config));
			lastChild.setAttribute('stage', 7).type = 'link-text';
		}
		if (this.childNodes.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
	}

	/**
	 * 自动生成管道符后的链接文字
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
