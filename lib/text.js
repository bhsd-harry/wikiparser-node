'use strict';

/** @typedef {import('..').LintError} LintError */

const Parser = require('..'),
	AstNode = require('./node');

const errorSyntax = /https?:\/\/|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)/giu,
	disallowedTags = [
		'html',
		'head',
		'style',
		'title',
		'body',
		'a',
		'audio',
		'img',
		'video',
		'embed',
		'iframe',
		'object',
		'canvas',
		'script',
		'col',
		'colgroup',
		'tbody',
		'tfoot',
		'thead',
		'button',
		'input',
		'label',
		'option',
		'select',
		'textarea',
	];

/** 文本节点 */
class AstText extends AstNode {
	/** @type {'text'} */ type = 'text';
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
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const {data, parentNode, nextSibling, previousSibling} = this,
			type = parentNode?.type,
			name = parentNode?.name,
			nextType = nextSibling?.type,
			previousType = previousSibling?.type,
			errorRegex
			= type === 'free-ext-link' || type === 'ext-link-url' || type === 'image-parameter' && name === 'link'
				? errorSyntaxUrl
				: errorSyntax,
			errors = [],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (data.search(errorRegex) !== -1) {
			errorRegex.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start),
				tags = new Set([ext, html, disallowedTags].flat(2));
			for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
				const [, prefix, tag] = mt;
				let {0: error, index} = mt;
				if (prefix && prefix !== ']') {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const startIndex = start + index,
					lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines[lines.length - 1],
					startCol = lines.length > 1 ? line.length : left + line.length,
					{0: char, length} = error,
					endIndex = startIndex + length,
					rootStr = String(root),
					nextChar = rootStr[endIndex],
					previousChar = rootStr[startIndex - 1],
					severity = length > 1 && (char !== '<' || /[\s/>]/u.test(nextChar))
						|| char === '{' && (nextChar === char || previousChar === '-')
						|| char === '}' && (previousChar === char || nextChar === '-')
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
				if ((char !== 'h' || index > 0) && (char !== '<' || tags.has(tag.toLowerCase()))) {
					errors.push({
						message: Parser.msg('lonely "$1"', char === 'h' ? error : char),
						severity,
						startIndex,
						endIndex,
						startLine,
						endLine: startLine,
						startCol,
						endCol: startCol + length,
					});
				}
			}
		}
		return errors;
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
