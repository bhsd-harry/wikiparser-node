import {generateForChild} from '../../util/lint';
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
	}

	/** @private */
	override getTitle(): Title {
		return this.normalizeTitle(String(this.firstChild), 0, true, true);
	}

	/** @override */
	override text(): string {
		return `[[${String(this.firstChild)}]]`;
	}

	/** @override */
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
}
