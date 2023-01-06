'use strict';

const AstNode = require('./node'),
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
		if (typeof text !== 'string') {
			this.typeError('constructor', 'String');
		}
		this.data = text;
		Object.defineProperty(this, 'childNodes', {enumerable: false, configurable: false});
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
	 */
	appendData(text) {
		if (typeof text !== 'string') {
			this.typeError('appendData', 'String');
		}
		this.data += text;
	}

	/**
	 * 删减字符串
	 * @param {number} offset 起始位置
	 * @param {number} count 删减字符数
	 * @throws `RangeError` 错误的删减位置
	 */
	deleteData(offset, count) {
		if (typeof offset !== 'number' || typeof count !== 'number') {
			this.typeError('deleteData', 'Number');
		} else if (offset >= this.length || offset < -this.length || !Number.isInteger(offset)) {
			throw new RangeError(`错误的删减位置！${offset}`);
		}
		this.data = this.data.slice(0, offset) + this.data.slice(offset + count);
	}

	/**
	 * 插入字符串
	 * @param {number} offset 插入位置
	 * @param {string} text 待插入的字符串
	 * @throws `RangeError` 错误的插入位置
	 */
	insertData(offset, text) {
		if (typeof offset !== 'number') {
			this.typeError('insertData', 'Number');
		} else if (typeof text !== 'string') {
			this.typeError('insertData', 'String');
		} else if (offset > this.length || offset < -this.length || !Number.isInteger(offset)) {
			throw new RangeError(`错误的插入位置！${offset}`);
		}
		this.data = this.data.slice(0, offset) + text + this.data.slice(offset);
	}

	/**
	 * 替换字符串
	 * @param {string} text 替换的字符串
	 */
	replaceData(text = '') {
		if (typeof text !== 'string') {
			this.typeError('replaceData', 'String');
		}
		this.data = text;
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
		this.data = this.data.slice(0, offset);
		this.after(newText);
		return newText;
	}
}

Parser.classes.Text = __filename;
module.exports = Text;
