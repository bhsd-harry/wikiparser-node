import Parser from '../index';
import {Token} from '.';
import {NoincludeToken} from './nowiki/noinclude';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
export class PreToken extends Token {
	/** @browser */
	override readonly type = 'ext-inner';
	declare name: 'pre';
	declare childNodes: (AstText | NoincludeToken | ConverterToken)[];
	// @ts-expect-error abstract method
	abstract override get children(): (NoincludeToken | ConverterToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText | NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AstText | NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): NoincludeToken | ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ExtToken | undefined;

	/** @browser */
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
		super(wikitext, config, true, accum, {
			AstText: ':', NoincludeToken: ':', ConverterToken: ':',
		});
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @private */
	protected override isPlain(): boolean {
		return true;
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new PreToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes['PreToken'] = __filename;
