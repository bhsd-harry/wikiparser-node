'use strict';

const AstNode = require('./node'),
	AstElement = require('./element');

const errorSyntax = /https?:|[{}]+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<(?=\s*\/?[a-z]\w*[\s/>])/giu,
	errorSyntaxUrl = /[{}]+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<(?=\s*\/?[a-z]\w*[\s/>])/giu;

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
	 * 修改内容
	 * @param {string} text 新内容
	 */
	#setData(text) {
		text = String(text);
		this.setAttribute('data', text);
		return this;
	}

	/**
	 * 替换字符串
	 * @param {string} text 替换的字符串
	 */
	replaceData(text = '') {
		this.#setData(text);
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
			|| type === 'html-attrs' && name === 'img'
				? errorSyntaxUrl
				: errorSyntax,
			errors = [];
		if (data.search(errorRegex) !== -1) {
			errorRegex.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start);
			for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
				const [, prefix] = mt;
				let {0: error, index} = mt;
				if (prefix) {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines.at(-1),
					startCol = lines.length > 1 ? line.length : left + line.length,
					{0: char, length} = error,
					end = start + index + (char === '}' || char === ']' ? length : 50);
				errors.push({
					message: `孤立的"${char === 'h' ? error : char}"`,
					severity: char === '{' || char === '}' || length > 1 ? 'error' : 'warning',
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: String(root).slice(Math.max(0, end - 50), end),
				});
			}
		}
		return errors;
	}
}

module.exports = AstText;
