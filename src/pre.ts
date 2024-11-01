import {
	MAX_STAGE,
} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import type {LintError} from '../base';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
export abstract class PreToken extends Token {
	declare readonly name: 'pre';

	declare readonly childNodes: readonly (AstText | NoincludeToken | ConverterToken)[];
	abstract override get firstChild(): AstText | NoincludeToken | ConverterToken | undefined;
	abstract override get lastChild(): AstText | NoincludeToken | ConverterToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
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
		});
		this.setAttribute('stage', MAX_STAGE - 1);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'plain') as TokenAttribute<T> || super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return super.lint(start, /<\s*\/\s*(pre)\b/giu);
	}
}
