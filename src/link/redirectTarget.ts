import {generateForChild, fixByRemove} from '../../util/lint';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import {NoincludeToken} from '../nowiki/noinclude';
import type {LintError, Config} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * target of a redirect
 *
 * 重定向目标
 * @classdesc `{childNodes: [AtomToken, ?NoincludeToken]}`
 */
export abstract class RedirectTargetToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, NoincludeToken];
	abstract override get lastChild(): AtomToken | NoincludeToken;
	abstract override get link(): Title;

	override get type(): 'redirect-target' {
		return 'redirect-target';
	}

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 */
	constructor(link: string, linkText?: string, config?: Config, accum?: Token[]) {
		super(link, undefined, config, accum);
		if (linkText !== undefined) {
			// @ts-expect-error abstract class
			this.insertAt(new NoincludeToken(linkText, config, accum));
		}
	}

	/** @private */
	override getTitle(): Title {
		return this.normalizeTitle(
			this.firstChild.toString(),
			0,
			{halfParsed: true, decode: true, page: ''},
		);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const errors = super.lint(start, false),
				rule = 'no-ignored',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule, 'redirect');
			if (s && this.length === 2) {
				const e = generateForChild(this.lastChild, {start}, rule, 'useless-link-text', s);
				e.startIndex--;
				e.startCol--;
				if (lintConfig.computeEditInfo || lintConfig.fix) {
					e.fix = fixByRemove(e);
				}
				errors.push(e);
			}
			return errors;
		}
	}
}
