import {fixed} from '../mixin/fixed';
import {singleLine} from '../mixin/singleLine';
import * as Parser from '../index';
import {Token} from '.';
import {NoincludeToken} from './nowiki/noinclude';
import {LinkToken} from './link';
import {ExtLinkToken} from './extLink';
import type {Title} from '../lib/title';
import type {AstText, ImagemapToken} from '../internal';

/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
export class ImagemapLinkToken extends fixed(singleLine(Token)) {
	/** @browser */
	override readonly type = 'imagemap-link';
	declare childNodes: [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	// @ts-expect-error abstract method
	abstract override get children(): [LinkToken | ExtLinkToken, NoincludeToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): LinkToken | ExtLinkToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): NoincludeToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): NoincludeToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ImagemapToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ImagemapToken | undefined;

	/** 内外链接 */
	get link(): string | Title {
		return this.childNodes[1].link;
	}

	set link(link) {
		this.childNodes[1].link = link;
	}

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
				? new LinkToken(...linkStuff, config, accum)
				: new ExtLinkToken(...linkStuff, config, accum),
			new NoincludeToken(post, config, accum),
		);
	}
}

Parser.classes['ImagemapLinkToken'] = __filename;
