import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

declare type Child = NoincludeToken | ConverterToken;

/**
 * `<pre>`
 * @classdesc `{childNodes: (AstText|NoincludeToken|ConverterToken)[]}`
 */
export abstract class PreToken extends Token {
	declare readonly name: 'pre';

	declare readonly childNodes: readonly (AstText | Child)[];
	abstract override get firstChild(): AstText | Child | undefined;
	abstract override get lastChild(): AstText | Child | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];
	abstract override get firstElementChild(): Child | undefined;
	abstract override get lastElementChild(): Child | undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get nextElementSibling(): undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext?: string, config?: Config, accum: Token[] = []) {
		if (wikitext) {
			const opening = /<nowiki>/giu,
				closing = /<\/nowiki>/giu,
				{length} = opening.source;
			let i = opening.exec(wikitext);
			if (i) {
				closing.lastIndex = i.index + length;
			}
			let j = closing.exec(wikitext),
				lastIndex = 0,
				str = '';
			while (i && j) {
				// @ts-expect-error abstract class
				new NoincludeToken(i[0], config, accum);
				// @ts-expect-error abstract class
				new NoincludeToken(j[0], config, accum);
				str += `${wikitext.slice(lastIndex, i.index)}\0${accum.length - 1}n\x7F${
					wikitext.slice(i.index + length, j.index)
				}\0${accum.length}n\x7F`;
				lastIndex = j.index + length + 1;
				opening.lastIndex = lastIndex;
				i = opening.exec(wikitext);
				if (i) {
					closing.lastIndex = i.index + length;
				}
				j = closing.exec(wikitext);
			}
			wikitext = str + wikitext.slice(lastIndex);
		}
		super(wikitext, config, accum, {
			AstText: ':', NoincludeToken: ':', ConverterToken: ':',
		});
		this.setAttribute('stage', MAX_STAGE - 1);
	}

	/** @private */
	override isPlain(): true {
		return true;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return super.lint(start, /<\s*\/\s*(pre)\b/giu);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new PreToken(undefined, this.getAttribute('config')) as this;
			token.safeAppend(cloned);
			return token;
		});
	}
}

classes['PreToken'] = __filename;
