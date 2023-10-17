'use strict';
const string_1 = require('../util/string');
const {text, noWrap, print, extUrlChar, extUrlCharFirst} = string_1;
const lint_1 = require('../util/lint');
const {generateForSelf} = lint_1;
const Parser = require('../index');
const Token = require('.');
const params = new Set(['alt', 'link', 'lang', 'page', 'caption']);
/** @ignore */
// eslint-disable-next-line func-style
function validate(key, val, config = Parser.getConfig(), halfParsed = false) {
	const trimmedVal = val.trim();
	let value = trimmedVal.replace(/\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return /^(?:\d+x?|\d*x\d+)$/u.test(value);
		case 'link': {
			if (!value) {
				return trimmedVal;
			}
			const regex = new RegExp(`^(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar}$`, 'iu');
			if (regex.test(value)) {
				return trimmedVal;
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
}

/** 图片参数 */
class ImageParameterToken extends Token {
	/** @browser */
	type = 'image-parameter';
	/** @browser */
	#syntax = '';

	/**
	 * 图片链接
	 * @browser
	 */
	get link() {
		return this.name === 'link' ? validate('link', super.text(), this.getAttribute('config')) : undefined;
	}

	set link(value) {
		if (this.name === 'link') {
			this.setValue(String(value));
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
			const size = this.getValue().trim();
			if (!size.includes('{{')) {
				const [width, height = ''] = size.split('x');
				return {width, height};
			}
			const token = Parser.parse(size, false, 2, this.getAttribute('config')),
				i = token.childNodes.findIndex(child => child.type === 'text' && child.data.includes('x')),
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
			this.setValue(`${width || ''}${height && 'x'}${height}`);
		}
	}

	/** 图片高度 */
	get height() {
		return this.size?.height;
	}

	set height(height) {
		if (this.name === 'width') {
			this.setValue(`${this.width}${height ? `x${height}` : ''}`);
		}
	}

	/**
	 * @browser
	 * @param str 图片参数
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		let mt;
		const regexes = Object.entries(config.img).map(([syntax, param]) => [
				syntax,
				param,
				new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`, 'u'),
			]),
			param = regexes.find(([, key, regex]) => {
				mt = regex.exec(str);
				return mt
					&& (mt.length !== 4 || validate(key, mt[2], config, true) !== false);
			});
		if (param && mt) {
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
		super(str, {...config, excludes: [...config.excludes ?? [], 'list']}, true, accum);
		this.setAttribute('name', 'caption').setAttribute('stage', 7);
	}

	/** @private */
	afterBuild() {
		if (this.parentNode.type === 'gallery-image' && !params.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
	}

	/** @private */
	isPlain() {
		return this.name === 'caption';
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return this.#syntax && !(selector && this.matches(selector))
			? this.#syntax.replace('$1', super.toString(selector))
			: super.toString(selector);
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @private */
	getPadding() {
		return Math.max(0, this.#syntax.indexOf('$1'));
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			{link} = this;
		if (this.name === 'invalid') {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image parameter'));
		} else if (typeof link === 'object' && link.encoded) {
			errors.push(generateForSelf(this, {start}, 'unnecessary URL encoding in an internal link'));
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return this.#syntax
			? `<span class="wpb-image-parameter">${this.#syntax.replace('$1', `<span class="wpb-image-caption">${print(this.childNodes)}</span>`)}</span>`
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

	/** @private */
	getAttribute(key) {
		return key === 'syntax' ? this.#syntax : super.getAttribute(key);
	}

	/** @private */
	hasAttribute(key) {
		return key === 'syntax' || super.hasAttribute(key);
	}

	/** 是否是不可变参数 */
	#isVoid() {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/** @ignore */
	insertAt(token, i = this.length) {
		if (!Parser.running && this.#isVoid()) {
			throw new Error(`图片参数 ${this.name} 不接受自定义输入！`);
		}
		return super.insertAt(token, i);
	}

	/** 获取参数值 */
	getValue() {
		return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
	}

	/**
	 * 设置参数值
	 * @param value 参数值
	 * @throws	SyntaxError` 非法的参数值
	 */
	setValue(value) {
		if (this.name === 'invalid') {
			throw new Error('无效的图片参数！');
		} else if (this.#isVoid()) {
			if (typeof value !== 'boolean') {
				this.typeError('setValue', 'Boolean');
			} else if (!value) {
				this.remove();
			}
			return;
		} else if (typeof value !== 'string') {
			this.typeError('setValue', 'String');
		}
		const root = Parser.parse(`[[File:F|${this.#syntax ? this.#syntax.replace('$1', value) : value}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: file} = root;
		if (length !== 1 || file.type !== 'file' || file.length !== 2) {
			throw new SyntaxError(`非法的 ${this.name} 参数：${noWrap(value)}`);
		}
		const {lastChild: imageParameter, name} = file;
		if (name !== 'File:F' || imageParameter.name !== this.name) {
			throw new SyntaxError(`非法的 ${this.name} 参数：${noWrap(value)}`);
		}
		this.replaceChildren(...imageParameter.childNodes);
	}
}
Parser.classes.ImageParameterToken = __filename;
module.exports = ImageParameterToken;
