import {fixed} from '../mixin/fixed';
import {singleLine} from '../mixin/singleLine';
import {Parser} from '../index';
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
export abstract class ImagemapLinkToken extends fixed(singleLine(Token)) {
	/** @browser */
	override readonly type = 'imagemap-link';
	declare childNodes: [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get children(): [LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get firstElementChild(): LinkToken | ExtLinkToken;
	abstract override get lastChild(): NoincludeToken;
	abstract override get lastElementChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;
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
		linkStuff: [string, string | undefined, string | Title | undefined] | [string, string | undefined],
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

Parser.classes['ImagemapLinkToken'] = __filename;
