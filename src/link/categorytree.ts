import {generateForSelf} from '../../util/lint';
import {padded} from '../../mixin/padded';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import type {Config, LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {
	Token,
	AtomToken,
	AttributesToken,
	ExtToken,
} from '../../internal';

/**
 * `<categorytree>`
 * @classdesc `{childNodes: [AtomToken]}`
 */
@padded('')
export abstract class CategorytreeToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken];
	abstract override get lastChild(): AtomToken;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get link(): Title;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @param link 链接标题 */
	constructor(link: string, linkText?: undefined, config?: Config, accum: Token[] = []) {
		super(link, linkText, config, accum);
		this.setAttribute('bracket', false);
	}

	/** @private */
	override getTitle(): Title {
		const target = this.firstChild.toString().trim(),
			opt = {halfParsed: true},
			title = this.normalizeTitle(target, 14, opt);
		return title.valid && title.ns === 14
			? title
			: this.normalizeTitle(`Category:${target}`, 0, opt);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				s = Parser.lintConfig.getSeverity(rule, 'categorytree');
			if (s) {
				const {link} = this;
				if (
					!link.valid || link.ns !== 14
				) {
					return [generateForSelf(this, {start}, rule, 'invalid-category', s)];
				}
			}
			return super.lint(start, false);
		}
	}
}
