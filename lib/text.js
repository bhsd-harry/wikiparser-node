'use strict';

const AstNode = require('./node'),
	{externalUse} = require('../util/debug'),
	Parser = require('..');

/** 文本节点 */
class Text extends AstNode {
	type = 'text';
	data;

	/** 文本长度 */
	get length() {
		return this.data.length;
	}

	/** @param {string} text 包含文本 */
	constructor(text = '') {
		super();
		this.data = text;
		Object.defineProperties(this, {
			data: {writable: false},
			childNodes: {enumerable: false, configurable: false},
			type: {enumerable: false, writable: false, configurable: false},
		});
	}

	/** 复制 */
	cloneNode() {
		return new Text(this.data);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 */
	setAttribute(key, value) {
		if (key === 'data') {
			value = String(value);
			const {data} = this,
				e = new Event('text', {bubbles: true});
			Object.defineProperty(this, 'data', {value});
			if (data !== value) {
				this.dispatchEvent(e, {oldText: data, newText: value});
			}
			return this;
		}
		return super.setAttribute(key, value);
	}

	/** 输出字符串 */
	toString() {
		return this.data;
	}

	/** @override */
	text() {
		return this.data;
	}

	/**
	 * @override
	 * @throws `Error` 文本节点没有子节点
	 */
	verifyChild() { // eslint-disable-line class-methods-use-this
		throw new Error('文本节点没有子节点！');
	}

	/**
	 * 在后方添加字符串
	 * @param {string} text 添加的字符串
	 * @throws `Error` 禁止外部调用
	 */
	appendData(text) {
		if (externalUse('appendData')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.appendData 方法！`);
		}
		Object.defineProperty(this, 'data', {value: this.data + text});
	}

	/**
	 * 删减字符串
	 * @param {number} offset 起始位置
	 * @param {number} count 删减字符数
	 * @throws `RangeError` 错误的删减位置
	 * @throws `Error` 禁止外部调用
	 */
	deleteData(offset, count) {
		if (externalUse('deleteData')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.deleteData 方法！`);
		}
		Object.defineProperty(this, 'data', {value: this.data.slice(0, offset) + this.data.slice(offset + count)});
	}

	/**
	 * 插入字符串
	 * @param {number} offset 插入位置
	 * @param {string} text 待插入的字符串
	 * @throws `RangeError` 错误的插入位置
	 * @throws `Error` 禁止外部调用
	 */
	insertData(offset, text) {
		if (externalUse('insertData')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.insertData 方法！`);
		}
		Object.defineProperty(this, 'data', {value: this.data.slice(0, offset) + text + this.data.slice(offset)});
	}

	/**
	 * 替换字符串
	 * @param {string} text 替换的字符串
	 * @throws `Error` 禁止外部调用
	 */
	replaceData(text = '') {
		if (externalUse('replaceData')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.replaceData 方法！`);
		}
		Object.defineProperty(this, 'data', {value: text});
	}

	/**
	 * 提取子串
	 * @param {number} offset 起始位置
	 * @param {number} count 字符数
	 */
	substringData(offset, count) {
		return this.data.slice(offset, offset + count);
	}

	/**
	 * 将文本子节点分裂为两部分
	 * @param {number} offset 分裂位置
	 * @throws `RangeError` 错误的断开位置
	 */
	splitText(offset) {
		if (typeof offset !== 'number') {
			this.typeError('splitText', 'Number');
		} else if (offset > this.length || offset < -this.length || !Number.isInteger(offset)) {
			throw new RangeError(`错误的断开位置！${offset}`);
		}
		const newText = new Text(this.data.slice(offset));
		Object.defineProperty(this, 'data', {value: this.data.slice(0, offset)});
		this.after(newText);
		return newText;
	}
}

Parser.classes.Text = __filename;
module.exports = Text;
