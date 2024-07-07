import {generateForSelf} from '../../util/lint';
import {classes} from '../../util/constants';
import {encode, rawurldecode} from '../../util/string';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token];
	abstract override get link(): Title;
	abstract override set link(link: string);

	/* NOT FOR BROWSER END */

	override get type(): 'link' {
		return 'link';
	}

	/* NOT FOR BROWSER */

	/** 链接显示文字 */
	get innerText(): string {
		return this.length > 1 ? this.lastChild.text() : rawurldecode(this.firstChild.text().replace(/^\s*:?/u, ''));
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

	/* NOT FOR BROWSER END */

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (this.closest('ext-link-text')) {
			errors.push(generateForSelf(this, {start}, 'nested-link', 'internal link in an external link'));
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/**
	 * 设置跨语言链接
	 * @param lang 语言前缀
	 * @param link 页面标题
	 * @throws `SyntaxError` 仅有fragment
	 */
	setLangLink(lang: string, link: string): void {
		link = link.trim();
		if (link.startsWith('#')) {
			throw new SyntaxError('An interlanguage link cannot be fragment only!');
		}
		super.setTarget(lang + (link.startsWith(':') ? '' : ':') + link);
	}

	/**
	 * 修改为到自身的链接
	 * @param fragment fragment
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment = this.fragment): void {
		if (!fragment?.trim()) {
			throw new RangeError('LinkToken.asSelfLink method must specify a non-empty fragment!');
		}
		this.setTarget(`#${encode(fragment)}`);
	}

	/**
	 * 自动生成管道符后的链接文字
	 * @throws `Error` 带有"#"或"%"时不可用
	 */
	pipeTrick(): void {
		const linkText = this.firstChild.text();
		if (linkText.includes('#') || linkText.includes('%')) {
			throw new Error('Pipe trick cannot be used with "#" or "%"!');
		}
		const m1 = /^:?(?:[ \w\x80-\xFF-]+:)?([^(]+?) ?\(.+\)$/u.exec(linkText) as [string, string] | null;
		if (m1) {
			this.setLinkText(m1[1]);
			return;
		}
		const m2 = /^:?(?:[ \w\x80-\xFF-]+:)?([^（]+?) ?（.+）$/u.exec(linkText) as [string, string] | null;
		if (m2) {
			this.setLinkText(m2[1]);
			return;
		}
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.+?)(?: ?(?<!\()\(.+\))?(?:(?:, |，|، ).|$)/u
			.exec(linkText) as [string, string] | null;
		if (m3) {
			this.setLinkText(m3[1]);
			return;
		}
		this.setLinkText(linkText);
	}
}

classes['LinkToken'] = __filename;
