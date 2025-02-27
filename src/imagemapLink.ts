import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import {LinkToken} from './link/index';
import {ExtLinkToken} from './extLink';
import type {Config} from '../base';
import type {AstText, ImagemapToken, GalleryImageToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';
import {singleLine} from '../mixin/singleLine';
import type {Title} from '../lib/title';

/* NOT FOR BROWSER END */

/**
 * link inside the `<imagemap>`
 *
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
@fixedToken @singleLine()
export abstract class ImagemapLinkToken extends Token {
	declare readonly childNodes: readonly [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;
	abstract override get previousSibling(): GalleryImageToken | this | NoincludeToken | AstText;
	abstract override get nextSibling(): this | NoincludeToken | AstText | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstElementChild(): LinkToken | ExtLinkToken;
	abstract override get lastElementChild(): NoincludeToken;
	abstract override get parentElement(): ImagemapToken | undefined;
	abstract override get previousElementSibling(): GalleryImageToken | this | NoincludeToken;
	abstract override get nextElementSibling(): this | NoincludeToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'imagemap-link' {
		return 'imagemap-link';
	}

	/* NOT FOR BROWSER */

	/** internal or external link / 内外链接 */
	get link(): string | Title {
		return this.childNodes[1].link;
	}

	set link(link: string) {
		this.childNodes[1].link = link;
	}

	/* NOT FOR BROWSER END */

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

classes['ImagemapLinkToken'] = __filename;
