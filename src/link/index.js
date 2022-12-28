'use strict';

const Title = require('../../lib/title'), // eslint-disable-line no-unused-vars
	{text, noWrap} = require('../../util/string'),
	{undo} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';
	selfLink;
	fragment;
	interwiki;

	/**
	 * @param {string} link
	 * @param {string|undefined} linkText
	 * @param {Title} title
	 * @param {accum} accum
	 */
	constructor(link, linkText, title, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('../atom');
		this.appendChild(new AtomToken(link, 'link-target', config, accum, {
			'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum, {'Stage-5': ':', ConverterToken: ':'});
			inner.type = 'link-text';
			this.appendChild(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.selfLink = !title.title;
		this.fragment = title.fragment;
		this.interwiki = title.interwiki;
		this.setAttribute('name', title.title).seal(['selfLink', 'fragment', 'interwiki']).protectChildren(0);
	}

	cloneNode() {
		const [link, ...linkText] = this.cloneChildren();
		return Parser.run(() => {
			const /** @type {typeof LinkToken} */ Constructor = this.constructor,
				token = new Constructor('', undefined, {
					title: this.name, interwiki: this.interwiki, fragment: this.fragment,
				}, this.getAttribute('config'));
			token.firstElementChild.safeReplaceWith(link);
			token.append(...linkText);
			return token.afterBuild();
		});
	}

	afterBuild() {
		if (this.name.includes('\0')) {
			this.setAttribute('name', text(this.buildFromStr(this.name)));
		}
		if (this.fragment.includes('\0')) {
			this.setAttribute('fragment', text(this.buildFromStr(this.fragment)));
		}
		const that = this;
		const /** @type {AstListener} */ linkListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					{title, interwiki, fragment, ns, valid} = that.normalizeTitle(name);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的内链目标：${name}`);
				} else if (that.type === 'category' && (interwiki || ns !== 14)
					|| that.type === 'file' && (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(`${that.type === 'file' ? '文件' : '分类'}链接不可更改命名空间：${name}`);
				} else if (that.type === 'link' && !interwiki && [6, 14].includes(ns) && !name.trim().startsWith(':')) {
					const {firstChild} = prevTarget;
					if (typeof firstChild === 'string') {
						prevTarget.setText(`:${firstChild}`);
					} else {
						prevTarget.prepend(':');
					}
				}
				that.setAttribute('selfLink', !title).setAttribute('interwiki', interwiki)
					.setAttribute('name', title).setAttribute('fragment', fragment);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
		return this;
	}

	toString() {
		const str = super.toString('|');
		return this.type === 'gallery-image' ? str : `[[${str}]]`;
	}

	getPadding() {
		return 2;
	}

	getGaps() {
		return 1;
	}

	text() {
		const str = super.text('|');
		return this.type === 'gallery-image' ? str : `[[${str}]]`;
	}

	/** @param {string} link */
	setTarget(link) {
		link = String(link);
		if (link.type === 'link' && !/^\s*[:#]/.test(link)) {
			link = `:${link}`;
		}
		const root = Parser.parse(`[[${link}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== this.type || firstElementChild.childNodes.length !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类', 'gallery-image': '文件链接'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${link}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstElementChild.safeReplaceWith(firstChild);
	}

	/**
	 * @param {string} lang
	 * @param {string} link
	 */
	setLangLink(lang, link) {
		if (typeof lang !== 'string') {
			this.typeError('setLangLink', 'String');
		}
		link = String(link).trim();
		if (link.startsWith('#')) {
			throw new SyntaxError(`跨语言链接不能仅为fragment！`);
		} else if (link.startsWith(':')) {
			link = link.slice(1);
		}
		const root = Parser.parse(`[[${lang}:${link}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			/** @type {Token & {firstElementChild: LinkToken}} */ {childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'link' || firstElementChild.childNodes.length !== 1
			|| firstElementChild.interwiki !== lang.toLowerCase()
		) {
			throw new SyntaxError(`非法的跨语言链接目标：${lang}:${link}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstElementChild.safeReplaceWith(firstChild);
	}

	/** @param {string} fragment */
	#setFragment(fragment, page = true) {
		fragment = String(fragment).replace(/[<>[]#|=!\]/g, p => encodeURIComponent(p));
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`[[${page ? `:${this.name}` : ''}#${fragment}]]`, include, 6, config),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'link' || firstElementChild.childNodes.length !== 1) {
			throw new SyntaxError(`非法的 fragment：${fragment}`);
		}
		if (page) {
			Parser.warn(`${this.constructor.name}.setFragment 方法会同时规范化页面名！`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstElementChild.safeReplaceWith(firstChild);
	}

	/** @param {string} fragment */
	setFragment(fragment) {
		this.#setFragment(fragment);
	}

	asSelfLink(fragment = this.fragment) {
		fragment = String(fragment);
		if (!fragment.trim()) {
			throw new RangeError(`${this.constructor.name}.asSelfLink 方法必须指定非空的 fragment！`);
		}
		this.#setFragment(fragment, false);
	}

	setLinkText(linkText = '') {
		linkText = String(linkText);
		let lastElementChild;
		const config = this.getAttribute('config');
		if (linkText) {
			const root = Parser.parse(`[[${
					this.type === 'category' ? 'Category:' : ''
				}L|${linkText}]]`, this.getAttribute('include'), 6, config),
				{childNodes: {length}, firstElementChild} = root;
			if (length !== 1 || firstElementChild?.type !== this.type || firstElementChild.childNodes.length !== 2) {
				throw new SyntaxError(`非法的${this.type === 'link' ? '内链文字' : '分类关键字'}：${noWrap(linkText)}`);
			}
			({lastElementChild} = firstElementChild);
		} else {
			lastElementChild = Parser.run(() => new Token('', config));
			lastElementChild.setAttribute('stage', 7).type = 'link-text';
		}
		if (this.childNodes.length === 1) {
			this.appendChild(lastElementChild);
		} else {
			this.lastElementChild.safeReplaceWith(lastElementChild);
		}
	}

	pipeTrick() {
		const linkText = this.firstElementChild.text();
		if (/[#%]/.test(linkText)) {
			throw new Error('Pipe trick 不能用于带有"#"或"%"的场合！');
		}
		const m1 = /^:?(?:[ \w\x80-\xff-]+:)?([^(]+)\(.+\)$/.exec(linkText);
		if (m1) {
			this.setLinkText(m1[1].trim());
			return;
		}
		const m2 = /^:?(?:[ \w\x80-\xff-]+:)?([^（]+)（.+）$/.exec(linkText);
		if (m2) {
			this.setLinkText(m2[1].trim());
			return;
		}
		const m3 = /^:?(?:[ \w\x80-\xff-]+:)?(.+?)(?:(?<!\()\(.+\))?(?:, |，|، ).+/.exec(linkText);
		if (m3) {
			this.setLinkText(m3[1].trim());
			return;
		}
		this.setLinkText(linkText);
	}
}

Parser.classes.LinkToken = __filename;
module.exports = LinkToken;
