'use strict';

const watchFirstChild = require('../../mixin/watchFirstChild'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends watchFirstChild(Token) {
	type = 'link';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {string} title
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('../atomToken'),
			target = new AtomToken(link, 'link-target', accum, {'Stage-2': ':', '!ExtToken': '', '!HeadingToken': ''});
		if (title === undefined) {
			title = this.normalizeTitle(link.includes('%') ? decodeURIComponent(link) : link);
		}
		if (title) {
			this.setAttribute('name', title);
		} else {
			this.selfLink = true;
		}
		if (link.includes('#')) {
			const fragment = link.split('#').slice(1).join('#').trimEnd().replaceAll(' ', '_');
			this.fragment = fragment.includes('%') ? decodeURIComponent(fragment) : fragment;
		}
		this.appendChild(target);
		if (text !== undefined) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'link-text';
			this.appendChild(inner.setAttribute('stage', 6));
		}
		this.protectChildren(0);
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

	plain() {
		return this.childElementCount === 1 ? [] : this.lastElementChild.plain();
	}

	/**
	 * @this {LinkToken & {firstChild: Token}}
	 * @param {string} link
	 */
	setTarget(link) {
		link = String(link);
		const root = new Token(`[[${link}]]`, this.getAttribute('config')).parse(7),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== this.type || firstElementChild.childElementCount !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${link}`);
		}
		const {firstChild} = firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * @this {LinkToken & {lastChild: Token}}
	 * @param {string} text
	 */
	setText(text) {
		text = String(text);
		const root = new Token(`[[L|${text}]]`, this.getAttribute('config')).parse(7),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'link' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的内链文字：${text.replaceAll('\n', '\\n')}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childElementCount === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
	}

	pipeTrick() {
		if (this.type !== 'link') {
			throw new Error(`Pipe trick 不能用于 ${this.constructor.name}`);
		}
		const text = this.firstElementChild.text();
		if (/[#%]/.test(text)) {
			throw new Error('Pipe trick 不能用于带有"#"或"%"的场合！');
		}
		const m1 = text.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?) ?\(.+\)$/);
		if (m1) {
			this.setText(m1[1]);
			return;
		}
		const m2 = text.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?) ?（.+）$/);
		if (m2) {
			this.setText(m2[1]);
			return;
		}
		const m3 = text.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?)(?: ?\(.+\))?(?:, |，|، ).+$/);
		if (m3) {
			this.setText(m3[1]);
			return;
		}
		this.setText(text);
	}
}

Parser.classes.LinkToken = __filename;
module.exports = LinkToken;
