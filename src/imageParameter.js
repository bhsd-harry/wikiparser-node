'use strict';

const {print, extUrlChar, extUrlCharFirst} = require('../util/string'),
	{generateForSelf} = require('../util/lint'),
	Title = require('../lib/title'),
	Parser = require('..'),
	Token = require('.');

const params = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 检查图片参数是否合法
 * @template {string} T
 * @param {T} key 参数名
 * @param {string} value 参数值
 * @returns {T extends 'link' ? string|Title : boolean}
 */
const validate = (key, value, config = Parser.getConfig(), halfParsed = false) => {
	value = value.replace(/\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return /^(?:\d+x?|\d*x\d+)$/u.test(value);
		case 'link': {
			if (!value) {
				return '';
			}
			const regex = new RegExp(`(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${
				extUrlChar
			}(?=\0\\d+t\x7F|$)`, 'iu');
			if (regex.test(value)) {
				return value;
			} else if (value.startsWith('[[') && value.endsWith(']]')) {
				value = value.slice(2, -2);
			}
			const title = Parser.normalizeTitle(value, 0, false, config, halfParsed, true, true);
			return title.valid && title;
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
};

/**
 * 图片参数
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
class ImageParameterToken extends Token {
	type = 'image-parameter';
	#syntax = '';

	/** 图片链接 */
	get link() {
		return this.name === 'link' ? validate('link', super.text(), this.getAttribute('config')) : undefined;
	}

	/**
	 * @param {string} str 图片参数
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		let mt;
		const regexes = Object.entries(config.img).map(
				/** @returns {[string, string, RegExp]} */
				([syntax, param]) => [syntax, param, new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`, 'u')],
			),
			param = regexes.find(([, key, regex]) => {
				mt = regex.exec(str);
				return mt && (mt.length !== 4 || validate(key, mt[2], config, true) !== false);
			});
		if (param) {
			if (mt.length === 3) {
				super(undefined, config, true, accum);
				this.#syntax = str;
			} else {
				super(mt[2], config, true, accum, {
				});
				this.#syntax = `${mt[1]}${param[0]}${mt[3]}`;
			}
			this.setAttribute('name', param[1]);
			return;
		}
		super(str, {...config, excludes: [...config.excludes, 'list']}, true, accum);
		this.setAttribute('name', 'caption').setAttribute('stage', 7);
	}

	/** @override */
	afterBuild() {
		if (this.parentNode.type === 'gallery-image' && !params.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
	}

	/** @override */
	isPlain() {
		return this.name === 'caption';
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
	text() {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @override */
	getPadding() {
		return Math.max(0, this.#syntax.indexOf('$1'));
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const errors = super.lint(start),
			/** @type {ImageParameterToken & {link: Title}} */ {link, name} = this;
		if (name === 'invalid') {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image parameter'));
		} else if (link?.encoded) {
			errors.push(generateForSelf(this, {start}, 'unnecessary URL encoding in an internal link'));
		}
		return errors;
	}

	/** @override */
	print() {
		return this.#syntax
			? `<span class="wpb-image-parameter">${
				this.#syntax.replace('$1', `<span class="wpb-image-caption">${print(this.childNodes)}</span>`)
			}</span>`
			: super.print({class: 'image-caption'});
	}
}

module.exports = ImageParameterToken;
