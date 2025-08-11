import {rawurldecode} from '@bhsd/common';
import {generateForSelf, fixBy} from '../../util/lint';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {encode} from '../../util/string';

/* NOT FOR BROWSER END */

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token];
	abstract override set link(link: string);

	/* NOT FOR BROWSER END */

	override get type(): 'link' {
		return 'link';
	}

	/** link text / 链接显示文字 */
	get innerText(): string {
		return this.length > 1
			? this.lastChild.text()
			: rawurldecode(this.firstChild.text().replace(/^\s*:?/u, ''));
	}

	/* NOT FOR BROWSER */

	set innerText(text) {
		this.setLinkText(text);
	}

	/** whether to be a self link / 是否链接到自身 */
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
		const errors = super.lint(start, re),
			rule = 'nested-link',
			s = Parser.lintConfig.getSeverity(rule);
		if (s && this.closest('ext-link-text')) {
			const e = generateForSelf(this, {start}, rule, 'internal link in an external link', s);
			e.suggestions = [fixBy(e, 'delink', this.innerText)];
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/**
	 * Set the interlanguage link
	 *
	 * 设置跨语言链接
	 * @param lang language prefix / 语言前缀
	 * @param link page title / 页面标题
	 * @throws `SyntaxError` 仅有片段标识符
	 */
	setLangLink(lang: string, link: string): void {
		link = link.trim();
		/* istanbul ignore if */
		if (link.startsWith('#')) {
			throw new SyntaxError('An interlanguage link cannot be fragment only!');
		}
		super.setTarget(lang + (link.startsWith(':') ? '' : ':') + link);
	}

	/**
	 * Convert to a self link
	 *
	 * 修改为到自身的链接
	 * @param fragment URI fragment / 片段标识符
	 * @throws `RangeError` 空的片段标识符
	 */
	asSelfLink(fragment = this.fragment): void {
		/* istanbul ignore if */
		if (!fragment?.trim()) {
			throw new RangeError('LinkToken.asSelfLink method must specify a non-empty fragment!');
		}
		this.setTarget(`#${encode(fragment)}`);
	}

	/**
	 * Automatically generate the link text after the pipe
	 *
	 * 自动生成管道符后的链接文字
	 * @throws `Error` 带有"#"或"%"时不可用
	 */
	pipeTrick(): void {
		const linkText = this.firstChild.text();
		/* istanbul ignore if */
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
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.*?)(?: ?(?<!\()\(.+\))?(?:(?:, |，|، ).|$)/u
			.exec(linkText) as string[] as [string, string];
		this.setLinkText(m3[1]);
	}
}

classes['LinkToken'] = __filename;
