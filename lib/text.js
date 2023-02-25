'use strict';

const Parser = require('..'),
	AstNode = require('./node'),
	AstElement = require('./element');

const errorSyntax = /https?:|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)(?=[\s/>])/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)(?=[\s/>])/giu,
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
	lint(start) {
		const {data, parentNode} = this,
			type = parentNode?.type,
			name = parentNode?.name,
			urlAttr = ['itemtype', 'src', 'srcset'].includes(parentNode?.parentNode?.name),
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
				if (prefix) {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const startIndex = start + index,
					lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines[lines.length - 1],
					startCol = lines.length > 1 ? line.length : left + line.length,
					{0: char, length} = error,
					endIndex = startIndex + length;
				let severity = length > 1 ? 'error' : 'warning';
				if (char === 'h') {
					switch (type) {
						case 'ext-link-text':
							severity = 'warning';
							break;
						case 'attr-value':
							if (urlAttr) {
								continue;
							}
							break;
						case 'ext-inner':
							if (name === 'sm2' || name === 'flashmp3') {
								continue;
							}
						// no default
					}
				} else if (char === '<' && !tags.has(tag.toLowerCase())) {
					continue;
				}
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
