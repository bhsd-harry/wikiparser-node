'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 自由外链
 * @classdesc `{childNodes: [...string|CommentToken|IncludeToken|NoincludeToken]}`
 */
class MagicLinkToken extends Token {
	type = 'free-ext-link';
	#protocolRegex;

	/** 协议 */
	get protocol() {
		return this.#protocolRegex.exec(this.text())?.[0];
	}

	set protocol(value) {
		if (typeof value !== 'string') {
			this.typeError('protocol', 'String');
		}
		if (!new RegExp(`${this.#protocolRegex.source}$`, 'iu').test(value)) {
			throw new RangeError(`非法的外链协议：${value}`);
		}
		this.replaceChildren(this.text().replace(this.#protocolRegex, value));
	}

	/**
	 * @param {string} url 网址
	 * @param {boolean} doubleSlash 是否接受"//"作为协议
	 * @param {accum} accum
	 */
	constructor(url, doubleSlash = false, config = Parser.getConfig(), accum = []) {
		super(url, config, true, accum, {'Stage-1': ':', '!ExtToken': ''});
		if (doubleSlash) {
			this.type = 'ext-link-url';
		}
		this.#protocolRegex = new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'iu');
	}

	/** @override */
	afterBuild() {
		const ParameterToken = require('./parameter');
		const /** @type {ParameterToken} */ parameter = this.closest('parameter');
		if (parameter?.getValue() === this.text()) {
			this.replaceWith(this.toString());
		}
		return this;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildren(),
			token = Parser.run(() => new MagicLinkToken(
				undefined, this.type === 'ext-link-url', this.getAttribute('config'),
			));
		token.append(...cloned);
		token.afterBuild();
		return token;
	}

	/**
	 * 获取网址
	 * @throws `Error` 非标准协议
	 */
	getUrl() {
		let url = this.text();
		if (url.startsWith('//')) {
			url = `https:${url}`;
		}
		try {
			return new URL(url);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${url}`);
			}
			throw e;
		}
	}

	/**
	 * 设置外链目标
	 * @param {string|URL} url 含协议的网址
	 * @throws `SyntaxError` 非法的自由外链目标
	 */
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
