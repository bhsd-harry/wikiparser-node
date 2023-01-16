'use strict';

const {print, extUrlChar} = require('../util/string'),
	Parser = require('..'),
	Token = require('.');

/**
 * 图片参数
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
class ImageParameterToken extends Token {
	/**
	 * 检查图片参数是否合法
	 * @template {string} T
	 * @param {T} key 参数名
	 * @param {string} value 参数值
	 */
	static #validate(key, value, config = Parser.getConfig(), halfParsed = false) {
		value = value.replaceAll(/\0\d+t\x7F/gu, '').trim();
		switch (key) {
			case 'width':
				return /^\d*(?:x\d*)?$/u.test(value);
			case 'link': {
				if (!value) {
					return true;
				}
				const regex = new RegExp(`(?:${config.protocol}|//)${extUrlChar}(?=\0\\d+t\x7F|$)`, 'iu');
				if (regex.test(value)) {
					return true;
				} else if (value.startsWith('[[') && value.endsWith(']]')) {
					value = value.slice(2, -2);
				}
				if (value.includes('%')) {
					try {
						value = decodeURIComponent(value);
					} catch {}
				}
				const title = Parser.normalizeTitle(value, 0, false, config, halfParsed);
				return title.valid;
			}
			case 'lang':
				return config.variants.includes(value);
			case 'alt':
			case 'class':
			case 'manualthumb':
				return true;
			default:
				return !isNaN(value);
		}
	}

	type = 'image-parameter';
	#syntax = '';

	/**
	 * @param {string} str 图片参数
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		const regexes = Object.entries(config.img).map(
				/** @returns {[string, string, RegExp]} */
				([syntax, param]) => [syntax, param, new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`, 'u')],
			),
			param = regexes.find(([,, regex]) => regex.test(str));
		if (param) {
			const mt = param[2].exec(str);
			if (mt.length !== 4 || ImageParameterToken.#validate(param[1], mt[2], config, true)) {
				if (mt.length === 3) {
					super(undefined, config, true, accum);
					this.#syntax = str;
				} else {
					super(mt[2], config, true, accum, {'Stage-2': ':', '!HeadingToken': ':'});
					this.#syntax = `${mt[1]}${param[0]}${mt[3]}`;
				}
				this.setAttribute('name', param[1]).setAttribute('stage', Parser.MAX_STAGE);
				return;
			}
		}
		super(str, config, true, accum);
		this.setAttribute('name', 'caption').setAttribute('stage', 7);
	}

	/** @override */
	isPlain() {
		return true;
	}

	/**
	 * @override
	 */
	toString(selector) {
		return this.#syntax
			? this.#syntax.replace('$1', super.toString(selector))
			: super.toString(selector);
	}

	/** @override */
	getPadding() {
		return Math.max(0, this.#syntax.indexOf('$1'));
	}

	/** @override */
	print() {
		return this.#syntax
			? `<span class="wpb-image-parameter">${this.#syntax.replace('$1', print(this.childNodes))}</span>`
			: super.print({class: 'image-caption'});
	}
}

module.exports = ImageParameterToken;
