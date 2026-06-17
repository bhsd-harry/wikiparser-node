import {generateForChild, fixByRemove} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {gapped} from '../mixin/gapped';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * `<seo>`
 * @classdesc `{childNodes: AstText[]}`
 */
@gapped()
export abstract class SeoToken extends Token {
	declare readonly name: 'seo';
	declare readonly childNodes: readonly AstText[];
	abstract override get firstChild(): AstText | undefined;
	abstract override get lastChild(): AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [];
	abstract override get firstElementChild(): undefined;
	abstract override get lastElementChild(): undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[]) {
		super(undefined, config, accum, {
			AstText: ':',
		});
		if (wikitext) {
			for (const parameter of wikitext.split('|')) {
				this.insertAt(parameter);
			}
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '|');
	}

	/** @private */
	override text(): string {
		return super.text('|');
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const errors: LintError[] = [],
				{name, childNodes, length} = this,
				{lintConfig} = Parser,
				rule = 'no-ignored',
				s = lintConfig.getSeverity(rule, name);
			if (s) {
				const rect = new BoundingRect(this, start);
				for (let i = 0; i < length; i++) {
					const child = childNodes[i]!,
						{data} = child;
					if (
						!data.includes('=')
						&& data.replace(/<!--[\s\S]*?-->/gu, '').trim()
					) {
						const e = generateForChild(child, rect, rule, Parser.msg('invalid-parameter', name), s);
						if (i) {
							e.startIndex--;
							e.startCol--;
						}
						if (lintConfig.computeEditInfo) {
							e.suggestions = [fixByRemove(e)];
						}
						errors.push(e);
					}
				}
			}
			return errors;
		}
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({sep: '|'});
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new SeoToken(undefined, this.getAttribute('config'));
	}
}

classes['SeoToken'] = __filename;
