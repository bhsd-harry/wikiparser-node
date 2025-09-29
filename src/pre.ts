import {
	MAX_STAGE,
} from '../util/constants';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: (AstText|NoincludeToken|ConverterToken)[]}`
 */
export abstract class PreToken extends Token {
	declare readonly name: 'pre';

	declare readonly childNodes: readonly (NoincludeToken | ConverterToken | AstText)[];
	abstract override get firstChild(): NoincludeToken | ConverterToken | AstText | undefined;
	abstract override get lastChild(): NoincludeToken | ConverterToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

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
				new NoincludeToken(i[0], config, accum, true);
				// @ts-expect-error abstract class
				new NoincludeToken(j[0], config, accum, true);
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
		});
		this.setAttribute('stage', MAX_STAGE - 1);
	}

	/** @private */
	override isPlain(): true {
		return true;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: return super.lint(start, /<\s*\/\s*(pre)\b/giu); // eslint-disable-line no-unused-labels
	}
}
