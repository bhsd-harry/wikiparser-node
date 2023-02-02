'use strict';

const Parser = require('..'),
	AstNode = require('./node'),
	AstElement = require('./element');

const errorSyntax = /https?:|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)(?=[\s/>])/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)(?=[\s/>])/giu;

/** 文本节点 */
class AstText extends AstNode {
	#config;
	type = 'text';
	/** @type {string} */ data;

	/** @param {string} text 包含文本 */
	constructor(text = '', config = Parser.getConfig()) {
		super();
		this.#config = config;
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
	lint(start = 0) {
		const {data, parentNode} = this,
			type = parentNode?.type,
			name = parentNode?.name,
			errorRegex
			= type === 'free-ext-link' || type === 'ext-link-url' || type === 'image-parameter' && name === 'link'
				? errorSyntaxUrl
				: errorSyntax,
			errors = [];
		if (data.search(errorRegex) !== -1) {
			errorRegex.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start),
				allowedTags = new Set([this.#config.ext, this.#config.html].flat(2));
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
				let severity = char === '{' || char === '}' || length > 1 ? 'error' : 'warning';
				if (char === 'h') {
					switch (parentNode?.type) {
						case 'ext-link-text':
							severity = 'warning';
							break;
						case 'attr-value': {
							const {parentNode: attr} = parentNode;
							if ((attr?.name === 'src' || attr?.name === 'srcset') && attr?.parentNode?.name === 'img') {
								continue;
							}
							break;
						}
						case 'ext-inner':
							if (name === 'sm2' || name === 'flashmp3') {
								continue;
							}
						// no default
					}
				} else if (char === '<' && !allowedTags.has(tag.toLowerCase())) {
					continue;
				}
				errors.push({
					message: `孤立的"${char === 'h' ? error : char}"`,
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
