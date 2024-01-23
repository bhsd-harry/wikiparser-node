import {classes} from '../../util/constants';
import {generateForSelf} from '../../util/lint';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
// @ts-expect-error not implementing all abstract methods
export class LinkToken extends LinkBaseToken {
	override readonly type = 'link';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get children(): [AtomToken] | [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get link(): Title;
	// @ts-expect-error abstract method
	abstract override set link(link);

	/* NOT FOR BROWSER */

	/** 链接显示文字 */
	get innerText(): string {
		return this.length > 1 ? this.lastChild.text() : this.firstChild.text().replace(/^\s*:/u, '');
	}

	set innerText(text) {
		this.setLinkText(text);
	}

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

	/* NOT FOR BROWSER END */

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.closest('ext-link-text')) {
			errors.push(generateForSelf(this, {start}, 'internal link in an external link'));
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override setTarget(link: string): void {
		super.setTarget(`${/^\s*[:#]/u.test(link) ? '' : ':'}${link}`);
	}

	/**
	 * 设置跨语言链接
	 * @param lang 语言前缀
	 * @param link 页面标题
	 * @throws `SyntaxError` 仅有fragment
	 */
	setLangLink(lang: string, link: string): void {
		link = link.trim();
		if (link.startsWith('#')) {
			throw new SyntaxError('跨语言链接不能仅为fragment！');
		}
		super.setTarget(`${lang}${link.startsWith(':') ? '' : ':'}${link}`);
	}

	/**
	 * 设置fragment
	 * @param fragment fragment
	 * @param page 是否是其他页面
	 */
	#setFragment(fragment?: string, page = true): void {
		fragment &&= fragment.replace(/[<>[\]#|=]/gu, p => encodeURIComponent(p));
		this.setTarget(`${page ? this.name : ''}${fragment === undefined ? '' : `#${fragment}`}`);
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
			throw new RangeError('asSelfLink 方法必须指定非空的 fragment！');
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
		// eslint-disable-next-line es-x/no-regexp-lookbehind-assertions
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.+?)(?:(?<!\()\(.+\))?(?:, |，|، )./u
			.exec(linkText) as [string, string] | null;
		if (m3) {
			this.setLinkText(m3[1].trim());
			return;
		}
		this.setLinkText(linkText);
	}
}

classes['LinkToken'] = __filename;
