import {safeStringReplace} from '../util/replace';
import {Token} from './index';
import {CommentToken} from './nowiki/comment';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken} from '../internal';

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

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
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
}
