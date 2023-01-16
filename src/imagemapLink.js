'use strict';

const Token = require('.'),
	LinkToken = require('./link'),
	ExtLinkToken = require('./extLink');

/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
class ImagemapLinkToken extends Token {
	type = 'imagemap-link';

	/**
	 * @param {string} pre 链接前的文本
	 * @param {[string, string, string|Title]} linkStuff 内外链接
	 * @param {string} post 链接后的文本
	 * @param {accum} accum
	 */
	constructor(pre, linkStuff, post, config, accum) {
		const Title = require('../lib/title'),
			AstText = require('../lib/text'),
			NoincludeToken = require('./nowiki/noinclude');
		super(undefined, config, true, accum);
		this.append(
			new AstText(pre),
			linkStuff[2] instanceof Title
				? new LinkToken(...linkStuff, config, accum)
				: new ExtLinkToken(...linkStuff, config, accum),
			new NoincludeToken(post, config, accum),
		);
	}
}

module.exports = ImagemapLinkToken;
