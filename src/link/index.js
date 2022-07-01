'use strict';

const Title = require('../../lib/title'), // eslint-disable-line no-unused-vars
	{text} = require('../../util/string'),
	{undo} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';
	selfLink = false;
	fragment = '';
	interwiki = false;

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
			const inner = new Token(linkText, config, true, accum);
			inner.type = 'link-text';
			this.appendChild(inner.setAttribute('stage', 7));
		}
		this.selfLink = !title.title;
		this.fragment = title.fragment;
		this.interwiki = title.interwiki;
		this.setAttribute('name', title.title).seal(['selfLink', 'fragment', 'interwiki']).protectChildren(0);
	}

	cloneNode() {
		const [link, linkText] = this.cloneChildren();
		return Parser.run(() => {
			const /** @type {typeof LinkToken} */ Constructor = this.constructor,
				token = new Constructor('', undefined, {
					title: this.name, interwiki: this.interwiki, fragment: this.fragment,
				}, this.getAttribute('config'));
			token.firstElementChild.safeReplaceWith(link);
			if (linkText) {
				token.appendChild(linkText);
			}
			return token.afterBuild();
		});
	}

	afterBuild() {
		if (this.name.includes('\x00')) {
			this.setAttribute('name', text(this.buildFromStr(this.name)));
		}
		if (this.fragment.includes('\x00')) {
			this.setAttribute('fragment', text(this.buildFromStr(this.fragment)));
		}
		const that = this;
		const /** @type {AstListener} */ linkListener = (e, data) => {
			if (e.prevTarget?.type === 'link-target') {
				const name = e.prevTarget.text(),
					{title, interwiki, fragment, ns} = that.normalizeTitle(name);
				if (that.type === 'category' && (interwiki || ns !== 14)
					|| that.type === 'file' && (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(`${that.type === 'file' ? '文件' : '分类'}链接不可更改命名空间！`, name);
				}
				that.setAttribute('selfLink', !title).setAttribute('interwiki', interwiki)
					.setAttribute('name', title).setAttribute('fragment', fragment);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
		return this;
	}

	toString() {
		return `[[${super.toString('|')}]]`;
	}

	getPadding() {
		return 2;
	}

	getGaps() {
		return 1;
	}

	text() {
		return `[[${super.text('|')}]]`;
	}

	/** @returns {[number, string][]} */
	plain() {
		return this.childElementCount === 1 ? [] : this.lastElementChild.plain();
	}

	/** @param {string} link */
	setTarget(link) {
		link = String(link);
		const root = Parser.run(() =>
				new Token(`[[${link}]]`, this.getAttribute('config')).parse(6, this.getAttribute('include')),
			),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== this.type || firstElementChild.childElementCount !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${link}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstElementChild.safeReplaceWith(firstChild);
	}

	/** @param {string} fragment */
	#setFragment(fragment, page = true) {
		fragment = String(fragment).replace(/[<>[]#|=!]/g, p => encodeURIComponent(p));
		const root = Parser.run(() =>
				new Token(`[[${page ? this.name : ''}#${fragment}]]`, this.getAttribute('config'))
					.parse(6, this.getAttribute('include')),
			),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'link' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的 fragment：${fragment}`);
		}
		Parser.warn(`${this.constructor.name}.${page ? 'setFragment' : 'asSelfLink'} 方法会移除嵌入标记！`);
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
			const root = Parser.run(() =>
					new Token(`[[${this.type === 'category' ? 'Category:' : ''}L|${linkText}]]`, config)
						.parse(7, this.getAttribute('include')),
				),
				{childNodes: {length}, firstElementChild} = root;
			if (length !== 1 || firstElementChild?.type !== this.type || firstElementChild.childElementCount !== 2) {
				throw new SyntaxError(`非法的${this.type === 'link' ? '内链文字' : '分类关键字'}：${
					linkText.replaceAll('\n', '\\n')
				}`);
			}
			({lastElementChild} = firstElementChild);
		} else {
			lastElementChild = Parser.run(() => new Token('', config));
			lastElementChild.setAttribute('stage', 7).type = 'link-text';
		}
		if (this.childElementCount === 1) {
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
		const m1 = linkText.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?) ?\(.+\)$/);
		if (m1) {
			this.setLinkText(m1[1]);
			return;
		}
		const m2 = linkText.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?) ?（.+）$/);
		if (m2) {
			this.setLinkText(m2[1]);
			return;
		}
		const m3 = linkText.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?)(?: ?\(.+\))?(?:, |，|، ).+/);
		if (m3) {
			this.setLinkText(m3[1]);
			return;
		}
		this.setLinkText(linkText);
	}
}

Parser.classes.LinkToken = __filename;
module.exports = LinkToken;
