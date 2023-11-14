import Parser from '../index';
import {Token} from '.';
import {NoincludeToken} from './nowiki/noinclude';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
export abstract class PreToken extends Token {
	/** @browser */
	override readonly type = 'ext-inner';
	declare childNodes: (AstText | NoincludeToken | ConverterToken)[];
	abstract override get firstChild(): AstText | NoincludeToken | ConverterToken | undefined;
	abstract override get lastChild(): AstText | NoincludeToken | ConverterToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const text = wikitext?.replace(
			/(<nowiki>)(.*?)(<\/nowiki>)/giu,
			(_, opening: string, inner: string, closing: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(opening, config, accum);
				// @ts-expect-error abstract class
				new NoincludeToken(closing, config, accum);
				return `\0${accum.length - 1}c\x7F${inner}\0${accum.length}c\x7F`;
			},
		);
		super(text, config, true, accum, {
		});
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @private */
	protected override isPlain(): boolean {
		return true;
	}
}
