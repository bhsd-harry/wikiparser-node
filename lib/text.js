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

	/**
	 * 修改内容
	 * @param {string} text 新内容
	 */
	#setData(text) {
		return this.setAttribute('data', String(text));
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
			errors = [...data.matchAll(AstText.errorSyntax)];
		if (errors.length > 0) {
			const {top, left} = this.getRootNode().posFromIndex(start);
			return errors.map(({0: error, 1: prefix, index}) => {
				if (prefix) {
					index += prefix.length;
					error = error.slice(prefix.length);
				}
				const lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					{length} = lines.at(-1),
					startCol = lines.length > 1 ? length : left + length;
				return {
					message: `孤立的"${error[0]}"`,
					severity: error[0] === '{' || error[0] === '}' ? 'error' : 'warning',
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + error.length,
				};
			});
		}
		return [];
	}
}

module.exports = AstText;
