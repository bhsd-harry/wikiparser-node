import {generateForChild} from '../../util/lint';
import {LinkBaseToken} from './base';
import {NoincludeToken} from '../nowiki/noinclude';
import type {LintError, Config} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, NoincludeToken];
	abstract override get lastElementChild(): AtomToken | NoincludeToken;
	abstract override set link(link: string);

	/* NOT FOR BROWSER END */

	override get type(): 'redirect-target' {
		return 'redirect-target';
	}

	/* NOT FOR BROWSER */

	/**
	 * link text
	 *
	 * 链接显示文字
	 * @since v1.10.0
	 */
	get innerText(): string {
		return this.link.toString(true);
	}

	/* NOT FOR BROWSER END */

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

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', {AtomToken: 0, NoincludeToken: 1});
		// @ts-expect-error abstract getter
		this.firstChild.setAttribute('acceptable', {AstText: ':'});
	}

	/** @private */
	override getTitle(): Title {
		return this.normalizeTitle(this.firstChild.toString(), 0, {halfParsed: true, decode: true});
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start, false);
		if (this.length === 2) {
			const e = generateForChild(
				this.lastChild,
				{start},
				'no-ignored',
				'useless link text',
				'warning',
			);
			e.startIndex--;
			e.startCol--;
			e.fix = {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/** @private */
	override setTarget(link: string): void {
		this.firstChild.setText(link);
	}

	/** @private */
	override setLinkText(linkStr?: string): void {
		if (!linkStr) {
			this.childNodes[1]?.remove();
		}
	}
}

classes['RedirectTargetToken'] = __filename;
