import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import type {Config, LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken, AttributesToken, ExtToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {cached} from '../../mixin/cached';
import {fixedToken} from '../../mixin/fixed';

/* NOT FOR BROWSER END */

/**
 * `<categorytree>`
 * @classdesc `{childNodes: [AtomToken]}`
 */
@fixedToken
export abstract class CategorytreeToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken];
	abstract override get lastChild(): AtomToken;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken];
	abstract override get lastElementChild(): AtomToken;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get parentElement(): ExtToken | undefined;
	abstract override set link(link: string);

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @param link 链接标题 */
	constructor(link: string, linkText?: undefined, config?: Config, accum: Token[] = []) {
		super(link, linkText, config, accum);
		this.setAttribute('bracket', false);

		/* NOT FOR BROWSER */

		// @ts-expect-error abstract getter override
		this.firstChild.setAttribute('acceptable', {AstText: 0});
	}

	override getTitle(): Title {
		const target = this.firstChild.toString().trim(),
			opt = {halfParsed: true},
			title = this.normalizeTitle(target, 14, opt);
		return title.valid && title.ns === 14
			&& !title.interwiki
			? title
			: this.normalizeTitle(`Category:${target}`, 0, opt);
	}

	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				s = Parser.lintConfig.getSeverity(rule, 'categorytree');
			if (s) {
				const {link} = this;
				if (
					!link.valid || link.ns !== 14
					|| link.interwiki
				) {
					return [generateForSelf(this, {start}, rule, 'invalid-category', s)];
				}
			}
			return super.lint(start, false);
		}
	}

	/* NOT FOR BROWSER */

	/** @private */
	@cached()
	override toHtmlInternal(): '' {
		return '';
	}
}

classes['CategorytreeToken'] = __filename;
