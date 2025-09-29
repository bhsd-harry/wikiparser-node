import {Token} from './index';
import {CommentToken} from './nowiki/comment';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken} from '../internal';

/**
 * `<hiero>`
 * @classdesc `{childNodes: (AstText|CommentToken)[]}`
 */
export abstract class CommentedToken extends Token {
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
			AstText: ':', CommentToken: ':',
		});
		if (wikitext) {
			let i = wikitext.indexOf('<!--'),
				j = i !== -1 && wikitext.indexOf('-->', i + 4),
				lastIndex = 0;
			while (j !== false && j !== -1) {
				if (i > lastIndex) {
					this.insertAt(wikitext.slice(lastIndex, i));
				}
				// @ts-expect-error abstract class
				this.insertAt(new CommentToken(wikitext.slice(i + 4, j), true, config, accum));
				lastIndex = j + 3;
				i = wikitext.indexOf('<!--', lastIndex);
				j = i !== -1 && wikitext.indexOf('-->', i + 4);
			}
			if (lastIndex < wikitext.length) {
				this.insertAt(wikitext.slice(lastIndex));
			}
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		// eslint-disable-next-line no-unused-labels
		LINT: return super.lint(start, new RegExp(String.raw`<\s*(?:\/\s*)?(${this.name})\b`, 'giu'));
	}
}
