'use strict';
const fixed = require('../mixin/fixed');
const singleLine = require('../mixin/singleLine');
const Parser = require('../index');
const Token = require('.');
const NoincludeToken = require('./nowiki/noinclude');
const LinkToken = require('./link');
const ExtLinkToken = require('./extLink');

/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
class ImagemapLinkToken extends fixed(singleLine(Token)) {
	/** @browser */
	type = 'imagemap-link';

	/** 内外链接 */
	get link() {
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
	constructor(pre, linkStuff, post, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.append(pre, linkStuff.length === 2
			? new LinkToken(...linkStuff, config, accum)
			: new ExtLinkToken(...linkStuff, config, accum), new NoincludeToken(post, config, accum));
	}
}
Parser.classes.ImagemapLinkToken = __filename;
module.exports = ImagemapLinkToken;
