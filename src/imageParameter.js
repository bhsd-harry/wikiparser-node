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
	static #validate(key, value, config = Parser.getConfig()) {
		value = value.replaceAll(/\0\d+t\x7F/gu, '').trim();
		if (key === 'width') {
			return /^\d*(?:x\d*)?$/u.test(value);
		} else if (['alt', 'class', 'manualthumb', 'frameless', 'framed', 'thumbnail'].includes(key)) {
			return true;
		} else if (key === 'link') {
			if (!value) {
				return true;
			}
			const regex = new RegExp(`(?:${config.protocol}|//)${extUrlChar}(?=\0\\d+t\x7F|$)`, 'iu');
			if (regex.test(value)) {
				return true;
			}
			if (value.startsWith('[[') && value.endsWith(']]')) {
				value = value.slice(2, -2);
			}
			if (value.includes('%')) {
				try {
					value = decodeURIComponent(value);
				} catch {}
			}
			const {valid} = Parser.normalizeTitle(value, 0, config, true);
			return valid;
		}
		return !isNaN(value);
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
					super(mt[2], config, true, accum);
					this.#syntax = `${mt[1]}${param[0]}${mt[3]}`;
				}
				this.setAttribute('stage', Parser.MAX_STAGE);
				return;
			}
		}
		super(str, config, true, accum);
		this.setAttribute('stage', 7);
	}

	/** @override */
	isPlain() {
		return true;
	}

	/** @override */
	toString() {
		return this.#syntax ? this.#syntax.replace('$1', super.toString()) : super.toString();
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
