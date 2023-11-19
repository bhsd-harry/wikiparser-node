import Parser from '../index';
import {Token} from '.';
import {NoincludeToken} from './nowiki/noinclude';
import {LinkToken} from './link';
import {ExtLinkToken} from './extLink';
import type {AstText, ImagemapToken} from '../internal';

/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
export abstract class ImagemapLinkToken extends Token {
	/** @browser */
	override readonly type = 'imagemap-link';
	declare childNodes: [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;

	/**
	 * @browser
	 * @param pre 链接前的文本
	 * @param linkStuff 内外链接
	 * @param post 链接后的文本
	 */
	constructor(
		pre: string,
		linkStuff: [string, string | undefined, string | undefined] | [string, string | undefined],
		post: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config, true, accum);
		this.append(
			pre,
			linkStuff.length === 2
				// @ts-expect-error abstract class
				? new LinkToken(...linkStuff, config, accum) as LinkToken
				// @ts-expect-error abstract class
				: new ExtLinkToken(...linkStuff, config, accum) as ExtLinkToken,
			// @ts-expect-error abstract class
			new NoincludeToken(post, config, accum) as NoincludeToken,
		);
	}
}
