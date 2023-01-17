'use strict';

const fixedToken = require('../mixin/fixedToken'),
	Parser = require('..'),
	Token = require('.'),
	LinkToken = require('./link'),
	ExtLinkToken = require('./extLink');

/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
class ImagemapLinkToken extends fixedToken(Token) {
	type = 'imagemap-link';

	/**
	 * 内外链接
	 * @this {{childNodes: (LinkToken|ExtLinkToken)[]}}
	 */
	get link() {
		return this.childNodes[1].link;
	}

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
		const SomeLinkToken = linkStuff[2] instanceof Title ? LinkToken : ExtLinkToken;
		super(undefined, config, true, accum);
		this.append(pre, new SomeLinkToken(...linkStuff, config, accum), new NoincludeToken(post, config, accum));
	}
}

Parser.classes.ImagemapLinkToken = __filename;
module.exports = ImagemapLinkToken;
