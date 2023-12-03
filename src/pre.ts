import {
	MAX_STAGE,
} from '../util/constants';
import * as Parser from '../index';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
export class PreToken extends Token {
	override readonly type = 'ext-inner';
	declare name: 'pre';

	declare childNodes: (AstText | NoincludeToken | ConverterToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText | NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AstText | NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		if (wikitext) {
			const opening = '<nowiki>',
				closing = '</nowiki>',
				{length} = opening;
			let i = wikitext.indexOf(opening),
				j = wikitext.indexOf(closing, i + length),
				str = '';
			while (i !== -1 && j !== -1) {
				new NoincludeToken(opening, config, accum);
				new NoincludeToken(closing, config, accum);
				str += `${wikitext.slice(0, i)}\0${accum.length - 1}c\x7F${
					wikitext.slice(i + length, j)
				}\0${accum.length}c\x7F`;
				wikitext = wikitext.slice(j + length + 1);
				i = wikitext.indexOf(opening);
				j = wikitext.indexOf(closing, i + length);
			}
			wikitext = `${str}${wikitext}`;
		}
		super(wikitext, config, accum, {
		});
		this.setAttribute('stage', MAX_STAGE - 1);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return (key === 'plain') as TokenAttributeGetter<T> || super.getAttribute(key);
	}
}
