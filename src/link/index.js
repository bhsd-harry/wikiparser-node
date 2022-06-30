'use strict';

const watchFirstChild = require('../../mixin/watchFirstChild'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends watchFirstChild(Token) {
	type = 'link';
	selfLink = false;
	fragment = '';
	interwiki = false;

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {string} title
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('../atom'),
			target = new AtomToken(link, 'link-target', config, accum, {
				'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
			});
		if (title === undefined) {
			title = this.normalizeTitle(link.includes('%') ? decodeURIComponent(link) : link);
		}
		if (title) {
			this.setAttribute('name', title);
			this.interwiki = this.isInterwiki(title)?.[1];
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
			this.appendChild(inner.setAttribute('stage', 7));
		}
		this.seal(['selfLink', 'fragment', 'interwiki']).protectChildren(0);
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
		const root = Parser.run(() => new Token(`[[${link}]]`, this.getAttribute('config')).parse(6)),
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

	/** @param {string} text */
	setText(text) {
		text = String(text);
		const root = Parser.run(() => new Token(`[[L|${text}]]`, this.getAttribute('config')).parse(6)),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'link' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的内链文字：${text.replaceAll('\n', '\\n')}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childElementCount === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastElementChild.safeReplaceWith(lastChild);
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
		const m3 = text.match(/^:?(?:[ \w\x80-\xff-]+:)?(.+?)(?: ?\(.+\))?(?:, |，|، ).+/);
		if (m3) {
			this.setText(m3[1]);
			return;
		}
		this.setText(text);
	}
}

Parser.classes.LinkToken = __filename;
module.exports = LinkToken;
