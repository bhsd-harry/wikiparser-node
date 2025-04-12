import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import {LinkToken} from './link/index';
import {ExtLinkToken} from './extLink';
import type {Config} from '../base';
import type {AstText, ImagemapToken, GalleryImageToken} from '../internal';

/**
 * link inside the `<imagemap>`
 *
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
export abstract class ImagemapLinkToken extends Token {
	declare readonly childNodes: readonly [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;
	abstract override get previousSibling(): GalleryImageToken | this | NoincludeToken | AstText | undefined;
	abstract override get nextSibling(): this | NoincludeToken | AstText | undefined;

	override get type(): 'imagemap-link' {
		return 'imagemap-link';
	}

	/**
	 * @param pre 链接前的文本
	 * @param linkStuff 内外链接
	 * @param post 链接后的文本
	 */
	constructor(
		pre: string,
		linkStuff: readonly [string, string | undefined, string | undefined] | readonly [string, string | undefined],
		post: string,
		config: Config,
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
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
