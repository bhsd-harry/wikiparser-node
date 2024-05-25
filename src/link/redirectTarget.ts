import {generateForChild} from '../../util/lint';
import {classes} from '../../util/constants';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {NoincludeToken} from '../nowiki/noinclude';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 重定向目标
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class RedirectTargetToken extends LinkBaseToken {
	override readonly type = 'redirect-target';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, NoincludeToken];
	abstract override get lastChild(): AtomToken | NoincludeToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, NoincludeToken];
	abstract override get lastElementChild(): AtomToken | NoincludeToken;
	abstract override get link(): Title;
	abstract override set link(link: string);

	/** @override */
	override get fragment(): string | undefined {
		return super.fragment;
	}

	override set fragment(fragment) {
		this.setFragment(fragment);
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

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(link, undefined, config, accum);
		if (linkText !== undefined) {
			// @ts-expect-error abstract class
			this.insertAt(new NoincludeToken(linkText, config, accum));
		}

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', {AtomToken: 0, NoincludeToken: 1});
		// @ts-expect-error abstract getter
		this.firstChild.setAttribute('acceptable', {AstText: ':'});
	}

	/** @private */
	override getTitle(): Title {
		return this.normalizeTitle(this.firstChild.toString(), 0, true, true);
	}

	/** @override */
	override text(): string {
		return `[[${this.firstChild.toString()}]]`;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start, /\]\]/u);
		if (this.length === 2) {
			const e = generateForChild(this.lastChild, {start}, 'no-ignored', 'useless link text');
			e.startIndex--;
			e.startCol--;
			e.fix = {
				range: [e.startIndex, e.endIndex],
				text: '',
			};
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/**
	 * 设置链接目标
	 * @param link 链接目标
	 */
	override setTarget(link: string): void {
		this.firstChild.setText(link);
	}

	/**
	 * 设置fragment
	 * @param fragment fragment
	 */
	setFragment(fragment?: string): void {
		fragment &&= fragment.replace(/[\]|]/gu, p => encodeURIComponent(p));
		this.setTarget(`${this.name}${fragment === undefined ? '' : `#${fragment}`}`);
	}

	/**
	 * 设置链接显示文字
	 * @param linkStr 链接显示文字
	 */
	override setLinkText(linkStr?: string): void {
		if (!linkStr) {
			this.childNodes[1]?.remove();
		}
	}
}

classes['RedirectTargetToken'] = __filename;
