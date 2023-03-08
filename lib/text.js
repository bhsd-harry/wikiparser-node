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

	/** @param {string} text 包含文本 */
	constructor(text = '') {
		super();
		this.data = text;
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
		this.setAttribute('data', text);
	}

	/**
	 * 替换字符串
	 * @param {string} text 替换的字符串
	 */
	replaceData(text = '') {
		this.#setData(text);
	}
}

module.exports = AstText;
