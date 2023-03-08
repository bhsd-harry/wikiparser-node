'use strict';

const Parser = require('..'),
	AstNode = require('./node'),
	AstElement = require('./element');

const errorSyntax = /https?:\/\/|\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
	disallowedTags = [
		'html',
		'base',
		'head',
		'style',
		'title',
		'body',
		'menu',
		'a',
		'area',
		'audio',
		'img',
		'map',
		'track',
		'video',
		'embed',
		'iframe',
		'object',
		'picture',
		'source',
		'canvas',
		'script',
		'col',
		'colgroup',
		'tbody',
		'tfoot',
		'thead',
		'button',
		'datalist',
		'fieldset',
		'form',
		'input',
		'label',
		'legend',
		'meter',
		'optgroup',
		'option',
		'output',
		'progress',
		'select',
		'textarea',
		'details',
		'dialog',
		'slot',
		'template',
		'dir',
		'frame',
		'frameset',
		'marquee',
		'param',
		'xmp',
	];

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
	lint(start = this.getAbsoluteIndex()) {
		const {data, parentNode, nextSibling, previousSibling} = this,
			type = parentNode?.type,
			name = parentNode?.name,
			nextType = nextSibling?.type,
			previousType = previousSibling?.type,
			errorRegex
			= type === 'free-ext-link' || type === 'ext-link-url' || type === 'image-parameter' && name === 'link'
				? errorSyntaxUrl
				: errorSyntax,
			errors = [...data.matchAll(errorRegex)],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (errors.length > 0) {
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start),
				tags = new Set([ext, html, disallowedTags].flat(2));
			return errors.map(/** @returns {LintError} */ ({0: error, 1: prefix, 2: tag, index}) => {
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
					end = char === '}' || char === ']' ? endIndex : startIndex + (char === 'h' ? 49 : 50),
					rootStr = String(root),
					nextChar = rootStr[endIndex],
					previousChar = rootStr[startIndex - 1],
					severity = length > 1 && (char !== '<' || /[\s/>]/u.test(nextChar))
						|| char === '{' && nextChar === char || char === '}' && previousChar === char
						|| char === '[' && (
							nextChar === char || type === 'ext-link-text'
							|| !data.slice(index + 1).trim() && nextType === 'free-ext-link'
						)
						|| char === ']' && (
							previousChar === char
							|| !data.slice(0, index).trim() && previousType === 'free-ext-link'
						)
						? 'error'
						: 'warning';
				return (char !== 'h' || index > 0) && (char !== '<' || tags.has(tag.toLowerCase())) && {
					message: Parser.msg('lonely "$1"', char === 'h' ? error : char),
					severity,
					startIndex,
					endIndex,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: rootStr.slice(Math.max(0, end - 50), end),
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
