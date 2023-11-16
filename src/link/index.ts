import Parser from '../../index';
import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	/** @browser */
	override readonly type: 'link' | 'category' = 'link';
	declare childNodes: [AtomToken] | [AtomToken, Token];
	abstract override get children(): [AtomToken] | [AtomToken, Token];
	abstract override get link(): Title;
	abstract override set link(link);

	/** 是否链接到自身 */
	get selfLink(): boolean {
		const {link: {title, fragment}} = this;
		return !title && Boolean(fragment);
	}

	set selfLink(selfLink) {
		if (selfLink) {
			this.asSelfLink();
		}
	}

	/** @override */
	override get fragment(): string | undefined {
		return super.fragment;
	}

	override set fragment(fragment) {
		this.#setFragment(fragment);
	}

	/** interwiki */
	get interwiki(): string {
		return this.link.interwiki;
	}

	/** @throws `RangeError` 非法的跨维基前缀 */
	set interwiki(interwiki) {
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
	 * @throws `SyntaxError` 仅有fragment
	 * @throws `SyntaxError` 非法的跨语言链接
	 */
	setLangLink(lang: string, link: string | Title): void {
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
		if (length !== 1 || !(wikiLink instanceof LinkToken) || wikiLink.length !== 1) {
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
	#setFragment(fragment?: string, page = true): void {
		fragment &&= fragment.replace(/[<>[\]#|=]/gu, p => encodeURIComponent(p));
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(
				`[[${page ? `:${this.name}` : ''}${fragment === undefined ? '' : `#${fragment}`}]]`,
				include,
				6,
				config,
			),
			{length, firstChild: wikiLink} = root;
		if (length !== 1 || !(wikiLink instanceof LinkToken) || wikiLink.length !== 1) {
			throw new SyntaxError(`非法的 fragment：${fragment ?? ''}`);
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
	setFragment(fragment?: string): void {
		this.#setFragment(fragment);
	}

	/**
	 * 修改为到自身的链接
	 * @param fragment fragment
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment = this.fragment): void {
		if (!fragment?.trim()) {
			throw new RangeError(`${this.constructor.name}.asSelfLink 方法必须指定非空的 fragment！`);
		}
		this.#setFragment(fragment, false);
	}

	/**
	 * 自动生成管道符后的链接文字
	 * @throws `Error` 带有"#"或"%"时不可用
	 */
	pipeTrick(): void {
		const linkText = this.firstChild.text();
		if (linkText.includes('#') || linkText.includes('%')) {
			throw new Error('Pipe trick 不能用于带有"#"或"%"的场合！');
		}
		const m1 = /^:?(?:[ \w\x80-\xFF-]+:)?([^(]+)\(.+\)$/u.exec(linkText) as [string, string] | null;
		if (m1) {
			this.setLinkText(m1[1].trim());
			return;
		}
		const m2 = /^:?(?:[ \w\x80-\xFF-]+:)?([^（]+)（.+）$/u.exec(linkText) as [string, string] | null;
		if (m2) {
			this.setLinkText(m2[1].trim());
			return;
		}
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.+?)(?:(?<!\()\(.+\))?(?:, |，|، )./u
			.exec(linkText) as [string, string] | null;
		if (m3) {
			this.setLinkText(m3[1].trim());
			return;
		}
		this.setLinkText(linkText);
	}
}

Parser.classes['LinkToken'] = __filename;
