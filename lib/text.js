'use strict';

const AstNode = require('./node');

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

	static errorSyntax = /[{}]+|\[{2,}|\[(?!(?:(?!https?\b)[^[])*\])|((?:^|\])[^[]*?)\]+|<(?=\s*\/?\w+[\s/>])/giu;

	/**
	 * Linter
	 * @param {number} start 起始位置
	 * @returns {LintError[]}
	 */
	lint(start = 0) {
		const {data} = this,
			errors = [];
		if (data.search(AstText.errorSyntax) !== -1) {
			AstText.errorSyntax.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start);
			for (let mt = AstText.errorSyntax.exec(data); mt; mt = AstText.errorSyntax.exec(data)) {
				const [, prefix] = mt;
				let {0: error, index} = mt;
				if (prefix) {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines[lines.length - 1],
					startCol = lines.length > 1 ? line.length : left + line.length,
					[char] = error;
				errors.push({
					message: `孤立的"${char}"`,
					severity: char === '{' || char === '}' ? 'error' : 'warning',
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + error.length,
				});
			}
		}
		return errors;
	}
}

module.exports = AstText;
