'use strict';

const AstNode = require('./node'),
	AstElement = require('./element'),
	Parser = require('..');

const errorSyntax = /https?:|[{}]+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|<(?=\s*\/?[a-z]\w*[\s/>])/giu,
	errorSyntaxUrl = /[{}]+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|<(?=\s*\/?[a-z]\w*[\s/>])/giu;

/** 文本节点 */
class AstText extends AstNode {
	type = 'text';
	/** @type {string} */ data;

	/** 文本长度 */
	get length() {
		return this.data.length;
	}

	/** @param {string} text 包含文本 */
	constructor(text = '') {
		super();
		Object.defineProperties(this, {
			data: {value: text, writable: false},
			childNodes: {enumerable: false, configurable: false},
			type: {enumerable: false, writable: false, configurable: false},
		});
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
	 * Linter
	 * @this {AstText & {parentNode: AstElement}}
	 * @param {number} start 起始位置
	 * @returns {LintError[]}
	 */
	lint(start = 0) {
		const {data, parentNode} = this,
			errorRegex = parentNode?.matches('free-ext-link, ext-link-url, image-parameter#link')
				? errorSyntaxUrl
				: errorSyntax,
			errors = [...data.matchAll(errorRegex)];
		if (errors.length > 0) {
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start);
			return errors.map(/** @returns {LintError} */ ({0: error, 1: prefix, index}) => {
				if (prefix) {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const startIndex = start + index,
					lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines.at(-1),
					startCol = lines.length > 1 ? line.length : left + line.length,
					{0: char, length} = error,
					endIndex = startIndex + length,
					end = char === '}' || char === ']' ? endIndex : startIndex + (char === 'h' ? 49 : 50);
				let severity = char === '{' || char === '}' || length > 1 ? 'error' : 'warning';
				if (char === 'h') {
					switch (parentNode?.type) {
						case 'ext-link-text':
							severity = 'warning';
							break;
						case 'attr-value': {
							const {parentNode: attr} = parentNode;
							if ((attr?.name === 'src' || attr?.name === 'srcset') && attr?.parentNode?.name === 'img') {
								return false;
							}
							break;
						}
						case 'ext-inner': {
							const {name} = parentNode;
							if (name === 'sm2' || name === 'flashmp3') {
								return false;
							}
						}
						// no default
					}
				}
				return {
					message: `孤立的"${char === 'h' ? error : char}"`,
					severity,
					startIndex,
					endIndex,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: String(root).slice(Math.max(0, end - 50), end),
				};
			}).filter(Boolean);
		}
		return [];
	}

	/**
	 * 修改内容
	 * @param {string} text 新内容
	 */
	#setData(text) {
		text = String(text);
		const {data} = this,
			e = new Event('text', {bubbles: true});
		this.setAttribute('data', text);
		if (data !== text) {
			this.dispatchEvent(e, {oldText: data, newText: text});
		}
		return this;
	}

	/**
	 * 替换字符串
	 * @param {string} text 替换的字符串
	 */
	replaceData(text = '') {
		this.#setData(text);
	}

	/** 复制 */
	cloneNode() {
		return new AstText(this.data);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 * @throws `Error` 文本节点没有子节点
	 */
	getAttribute(key) {
		return key === 'verifyChild'
			? () => {
				throw new Error('文本节点没有子节点！');
			}
			: super.getAttribute(key);
	}

	/**
	 * 在后方添加字符串
	 * @param {string} text 添加的字符串
	 */
	appendData(text) {
		this.#setData(this.data + text);
	}

	/**
	 * 删减字符串
	 * @param {number} offset 起始位置
	 * @param {number} count 删减字符数
	 */
	deleteData(offset, count) {
		this.#setData(this.data.slice(0, offset) + this.data.slice(offset + count));
	}

	/**
	 * 插入字符串
	 * @param {number} offset 插入位置
	 * @param {string} text 待插入的字符串
	 */
	insertData(offset, text) {
		this.#setData(this.data.slice(0, offset) + text + this.data.slice(offset));
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
	 * @throws `Error` 没有父节点
	 */
	splitText(offset) {
		if (!Number.isInteger(offset)) {
			this.typeError('splitText', 'Number');
		} else if (offset > this.length || offset < -this.length) {
			throw new RangeError(`错误的断开位置！${offset}`);
		}
		const {parentNode, data} = this;
		if (!parentNode) {
			throw new Error('待分裂的文本节点没有父节点！');
		}
		const newText = new AstText(data.slice(offset)),
			childNodes = [...parentNode.childNodes];
		this.setAttribute('data', data.slice(0, offset));
		childNodes.splice(childNodes.indexOf(this) + 1, 0, newText);
		newText.setAttribute('parentNode', parentNode);
		parentNode.setAttribute('childNodes', childNodes);
		return newText;
	}
}

Parser.classes.AstText = __filename;
module.exports = AstText;
