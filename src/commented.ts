import {safeStringReplace} from '../util/replace';
import {Token} from './index';
import {CommentToken} from './nowiki/comment';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * `<hiero>`
 * @classdesc `{childNodes: (AstText|CommentToken)[]}`
 */
export abstract class CommentedToken extends Token {
	declare readonly name: 'hiero';

	declare readonly childNodes: readonly (CommentToken | AstText)[];
	abstract override get firstChild(): CommentToken | AstText | undefined;
	abstract override get lastChild(): CommentToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): CommentToken[];
	abstract override get firstElementChild(): CommentToken | undefined;
	abstract override get lastElementChild(): CommentToken | undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			AstText: ':', CommentToken: ':',
		});
		if (wikitext) {
			safeStringReplace(
				wikitext,
				'<!--',
				'-->',
				false,
				inner => {
					// @ts-expect-error abstract class
					this.insertAt(new CommentToken(inner, true, config, accum));
					return '';
				},
				s => {
					this.insertAt(s);
					return '';
				},
			);
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: return super.lint(start, new RegExp(String.raw`<\s*(?:/\s*)?(${this.name})\b`, 'giu'));
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new CommentedToken(undefined, this.getAttribute('config'));
	}
}

classes['CommentedToken'] = __filename;
