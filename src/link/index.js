'use strict';
const Parser = require('../../index');
const LinkBaseToken = require('./base');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends LinkBaseToken {
	/** @browser */
	type = 'link';

	/** 是否链接到自身 */
	get selfLink() {
		const {link: {title, fragment}} = this;
		return !title && Boolean(fragment);
	}

	set selfLink(selfLink) {
		if (selfLink) {
			this.asSelfLink();
		}
	}

	/** @override */
	get fragment() {
		return super.fragment;
	}

	set fragment(fragment) {
		this.#setFragment(fragment);
	}

	/** interwiki */
	get interwiki() {
		return this.link.interwiki;
	}

	set interwiki(interwiki) {
		if (typeof interwiki !== 'string') {
			this.typeError('interwiki setter', 'String');
		}
		const {link: {prefix, main, fragment}} = this,
			link = `${interwiki}:${prefix}${main}${fragment === undefined ? '' : `#${fragment}`}`;
		if (interwiki && !this.isInterwiki(link)) {
			throw new RangeError(`${interwiki} 不是合法的跨维基前缀!`);
		}
		this.setTarget(link);
	}

	/**
	 * 设置跨语言链接
	 * @param lang 语言前缀
	 * @param link 页面标题
	 * @throws `SyntaxError` 非法的跨语言链接
	 */
	setLangLink(lang, link) {
		if (typeof lang !== 'string') {
			this.typeError('setLangLink', 'String');
		}
		let strLink = String(link).trim();
		const [char] = strLink;
		if (char === '#') {
			throw new SyntaxError('跨语言链接不能仅为fragment！');
		} else if (char === ':') {
			strLink = strLink.slice(1);
		}
		const config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			root = Parser.parse(`[[${lang}:${strLink}]]`, include, 6, config),
			{length, firstChild: wikiLink} = root;
		if (length !== 1 || wikiLink.type !== 'link' || wikiLink.length !== 1) {
			throw new SyntaxError(`非法的跨语言链接目标：${lang}:${strLink}`);
		}
		const {interwiki, firstChild} = wikiLink;
		if (interwiki !== lang.toLowerCase()) {
			throw new SyntaxError(`非法的跨语言链接目标：${lang}:${strLink}`);
		}
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @param fragment fragment
	 * @param page 是否是其他页面
	 * @throws `SyntaxError` 非法的fragment
	 */
	#setFragment(fragment, page = true) {
		const frag = fragment && fragment.replace(/[<>[\]#|=]/gu, p => encodeURIComponent(p)),
			include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`[[${page ? `:${this.name}` : ''}${frag === undefined ? '' : `#${frag}`}]]`, include, 6, config),
			{length, firstChild: wikiLink} = root;
		if (length !== 1 || wikiLink.type !== 'link' || wikiLink.length !== 1) {
			throw new SyntaxError(`非法的 fragment：${frag ?? ''}`);
		} else if (page) {
			Parser.warn(`${this.constructor.name}.setFragment 方法会同时规范化页面名！`);
		}
		const {firstChild} = wikiLink;
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置fragment
	 * @param fragment fragment
	 */
	setFragment(fragment) {
		this.#setFragment(fragment);
	}

	/**
	 * 修改为到自身的链接
	 * @param fragment fragment
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment = this.fragment) {
		if (!fragment?.trim()) {
			throw new RangeError(`${this.constructor.name}.asSelfLink 方法必须指定非空的 fragment！`);
		}
		this.#setFragment(fragment, false);
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
