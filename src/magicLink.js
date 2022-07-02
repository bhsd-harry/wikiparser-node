'use strict';

const {typeError} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 自由外链
 * @classdesc `{childNodes: [...string|CommentToken|IncludeToken|NoincludeToken]}`
 */
class MagicLinkToken extends Token {
	type = 'free-ext-link';
	#protocolRegex;

	get protocol() {
		return this.text().match(this.#protocolRegex)?.[0];
	}
	/** @param {string} value */
	set protocol(value) {
		if (typeof value !== 'string') {
			typeError(this, 'protocol', 'String');
		}
		if (!new RegExp(`${this.#protocolRegex.source}$`, 'i').test(value)) {
			throw new RangeError(`非法的外链协议：${value}`);
		}
		this.replaceChildren(this.text().replace(this.#protocolRegex, value));
	}

	/**
	 * @param {string} url
	 * @param {accum} accum
	 */
	constructor(url, doubleSlash = false, config = Parser.getConfig(), accum = []) {
		super(url, config, true, accum, {'Stage-1': ':', '!ExtToken': ''});
		if (doubleSlash) {
			this.type = 'ext-link-url';
		}
		this.#protocolRegex = new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'i');
	}

	afterBuild() {
		const ParameterToken = require('./parameter'), // eslint-disable-line no-unused-vars
			/** @type {ParameterToken} */ parameter = this.closest('parameter');
		if (parameter?.getValue() === this.text()) {
			this.replaceWith(this.toString());
		}
	}

	getUrl() {
		const url = this.text();
		try {
			return new URL(url);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${url}`);
			}
			throw e;
		}
	}

	/** @param {string|URL} url */
	setTarget(url) {
		url = String(url);
		const root = Parser.parse(url, this.getAttribute('include'), 9, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'free-ext-link') {
			throw new SyntaxError(`非法的自由外链目标：${url}`);
		}
		this.replaceChildren(...firstElementChild.childNodes);
	}
}

Parser.classes.MagicLinkToken = __filename;
module.exports = MagicLinkToken;
