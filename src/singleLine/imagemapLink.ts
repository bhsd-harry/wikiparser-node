import {SingleLineToken} from './index';
import {NoincludeToken} from '../nowiki/noinclude';
import {LinkToken} from '../link/index';
import {ExtLinkToken} from '../extLink';
import type {Config} from '../../base';
import type {AstText, ImagemapToken, GalleryImageToken, Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';

/* NOT FOR BROWSER END */

/**
 * link inside the `<imagemap>`
 *
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
export abstract class ImagemapLinkToken extends SingleLineToken {
	declare readonly childNodes: readonly [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;
	abstract override get previousSibling(): GalleryImageToken | this | NoincludeToken | AstText | undefined;
	abstract override get nextSibling(): this | NoincludeToken | AstText | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get previousElementSibling(): GalleryImageToken | this | NoincludeToken | undefined;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const link = this.childNodes[1].cloneNode();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ImagemapLinkToken(
				this.firstChild.data,
				link.type === 'link' ? ['', undefined] : ['', undefined, undefined],
				this.lastChild.toString(),
				this.getAttribute('config'),
			);
			(token.childNodes[1] as LinkToken).safeReplaceWith(link as LinkToken);
			return token;
		});
	}
}
