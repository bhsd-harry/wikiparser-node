'use strict';

const {text, noWrap, print, extUrlChar, extUrlCharFirst} = require('../util/string'),
	{generateForSelf} = require('../util/lint'),
	Title = require('../lib/title'),
	Parser = require('..'),
	AstText = require('../lib/text'),
	Token = require('.');

const params = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 检查图片参数是否合法
 * @template {string} T
 * @param {T} key 参数名
 * @param {string} val 参数值
 * @returns {T extends 'link' ? string|Title : boolean}
 */
const validate = (key, val, config = Parser.getConfig(), halfParsed = false) => {
	val = val.trim();
	let value = val.replace(/\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return /^(?:\d+x?|\d*x\d+)$/u.test(value);
		case 'link': {
			if (!value) {
				return val;
			}
			const regex = new RegExp(
				`^(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar}$`,
				'iu',
			);
			if (regex.test(value)) {
				return val;
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

	set link(value) {
		if (this.name === 'link') {
			this.setValue(value);
		}
	}

	/** getValue()的getter */
	get value() {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/** 图片大小 */
	get size() {
		if (this.name === 'width') {
			const /** @type {string} */ size = this.getValue().trim();
			if (!size.includes('{{')) {
				const [width, height = ''] = size.split('x');
				return {width, height};
			}
			const /** @type {{childNodes: AstText[]}} */ token = Parser.parse(size, false, 2, this.getAttribute('config')),
				i = token.childNodes.findIndex(({type, data}) => type === 'text' && data.includes('x')),
				str = token.childNodes[i];
			if (i === -1) {
				return {width: size, height: ''};
			}
			str.splitText(str.data.indexOf('x'));
			str.nextSibling.splitText(1);
			return {width: text(token.childNodes.slice(0, i + 1)), height: text(token.childNodes.slice(i + 2))};
		}
		return undefined;
	}

	/** 图片宽度 */
	get width() {
		return this.size?.width;
	}

	set width(width) {
		if (this.name === 'width') {
			const {height} = this;
			this.setValue(`${String(width || '')}${height && 'x'}${height}`);
		}
	}

	/** 图片高度 */
	get height() {
		return this.size?.height;
	}

	set height(height) {
		height = String(height || '');
		if (this.name === 'width') {
			this.setValue(`${this.width}${height && 'x'}${height}`);
		}
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
					'Stage-2': ':', '!HeadingToken': ':',
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
	 * @param {string} selector
	 */
	toString(selector) {
		return this.#syntax && !(selector && this.matches(selector))
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
	 * @this {ImageParameterToken & {link: Title}}
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		if (this.name === 'invalid') {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image parameter'));
		} else if (this.link?.encoded) {
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

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new ImageParameterToken(this.#syntax.replace('$1', ''), config);
			token.replaceChildren(...cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'syntax' ? this.#syntax : super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {PropertyKey} key 属性键
	 */
	hasAttribute(key) {
		return key === 'syntax' || super.hasAttribute(key);
	}

	/** 是否是不可变参数 */
	#isVoid() {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/**
	 * @override
	 * @template {Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 * @throws `Error` 不接受自定义输入的图片参数
	 */
	insertAt(token, i = this.length) {
		if (!Parser.running && this.#isVoid()) {
			throw new Error(`图片参数 ${this.name} 不接受自定义输入！`);
		}
		return super.insertAt(token, i);
	}

	/**
	 * 获取参数值
	 * @complexity `n`
	 */
	getValue() {
		return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
	}

	/**
	 * 设置参数值
	 * @param {string|boolean} value 参数值
	 * @complexity `n`
	 * @throws	SyntaxError` 非法的参数值
	 */
	setValue(value) {
		if (this.name === 'invalid') {
			throw new Error('无效的图片参数！');
		} else if (this.#isVoid()) {
			if (typeof value !== 'boolean') {
				this.typeError('setValue', 'Boolean');
			} else if (value === false) {
				this.remove();
			}
			return;
		} else if (typeof value !== 'string') {
			this.typeError('setValue', 'String');
		}
		const root = Parser.parse(`[[File:F|${
				this.#syntax ? this.#syntax.replace('$1', value) : value
			}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: file} = root,
			{lastChild: imageParameter, type, name, length: fileLength} = file;
		if (length !== 1 || type !== 'file' || name !== 'File:F' || fileLength !== 2
			|| imageParameter.name !== this.name
		) {
			throw new SyntaxError(`非法的 ${this.name} 参数：${noWrap(value)}`);
		}
		this.replaceChildren(...imageParameter.childNodes);
	}
}

Parser.classes.ImageParameterToken = __filename;
module.exports = ImageParameterToken;
