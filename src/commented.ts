import {Token} from './index';
import {CommentToken} from './nowiki/comment';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

/**
 * `<hiero>`
 * @classdesc `{childNodes: (AstText|CommentToken)[]}`
 */
export abstract class CommentedToken extends Token {
	declare readonly name: 'hiero';

	declare readonly childNodes: readonly (AstText | CommentToken)[];
	abstract override get firstChild(): AstText | CommentToken | undefined;
	abstract override get lastChild(): AstText | CommentToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): CommentToken[];
	abstract override get firstElementChild(): CommentToken | undefined;
	abstract override get lastElementChild(): CommentToken | undefined;
	abstract override get previousElementSibling(): AttributesToken;
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
		return super.lint(start, /<\s*\/\s*(hiero)\b/giu);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new CommentedToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['CommentedToken'] = __filename;
