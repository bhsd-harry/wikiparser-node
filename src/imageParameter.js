'use strict';

const {print, extUrlChar} = require('../util/string'),
	Title = require('../lib/title'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 图片参数
 * @classdesc `{childNodes: ...(string|Token)}`
 */
class ImageParameterToken extends Token {
	type = 'image-parameter';
	#syntax = '';

	static #noLink = Symbol('no-link');

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {string} value
	 */
	static #validate(key, value, config = Parser.getConfig()) {
		value = value.replace(/\x00\d+t\x7f/g, '').trim();
		if (key === 'width') {
			return /^\d*(?:x\d*)?$/.test(value);
		} else if (['alt', 'class', 'manualthumb', 'frameless', 'framed', 'thumbnail'].includes(key)) {
			return true;
		} else if (key === 'link') {
			if (!value) {
				return true;
			}
			const regex = new RegExp(`(?:${config.protocol}|//)${extUrlChar}(?=\x00\\d+t\x7f|$)`, 'ui');
			if (regex.test(value)) {
				return true;
			}
			if (/^\[\[.+]]$/.test(value)) {
				value = value.slice(2, -2);
			}
			if (value.includes('%')) {
				try {
					value = decodeURIComponent(value);
				} catch {}
			}
			const {valid} = new Title(value, 0, config);
			return valid;
		}
		return !isNaN(value);
	}

	/**
	 * @param {string} str
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		const regexes = Object.entries(config.img).map(
				/** @returns {[string, string, RegExp]} */
				([syntax, param]) => [syntax, param, new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`)],
			),
			param = regexes.find(([,, regex]) => regex.test(str));
		if (param) {
			const mt = str.match(param[2]);
			if (mt.length === 4 && !ImageParameterToken.#validate(param[1], mt[2], config)) {
				// pass
			} else {
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

	isPlain() {
		return true;
	}

	toString() {
		if (!this.#syntax) {
			return super.toString();
		}
		return this.#syntax.replace('$1', super.toString());
	}

	print() {
		if (!this.#syntax) {
			return super.print();
		}
		return `<span class="wpb-image-parameter">${this.#syntax.replace('$1', print(this.childNodes))}</span>`;
	}

	text() {
		if (!this.#syntax) {
			return super.text().trim();
		}
		return this.#syntax.replace('$1', super.text()).trim();
	}
}

module.exports = ImageParameterToken;
