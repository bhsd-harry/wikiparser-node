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

	static errorSyntax = /[{}]|\[{2,}|\[(?!(?:(?!https?\b)[^[])*\])|(?<=^|\])([^[]*?)\]+|<(?=\s*\/?\w+[\s/>])/giu;

	/**
	 * Linter
	 * @returns {LintError[]}
	 */
	lint() {
		const root = this.getRootNode(),
			{top, left} = root.posFromIndex(this.getAbsoluteIndex()),
			{data} = this;
		return [...data.matchAll(AstText.errorSyntax)].map(({0: error, 1: prefix, index}) => {
			if (prefix) {
				index += prefix.length;
				error = error.slice(prefix.length);
			}
			const lines = data.slice(0, index).split('\n'),
				startLine = lines.length + top - 1,
				{length} = lines.at(-1),
				startCol = lines.length > 1 ? length : left + length;
			return {
				message: `孤立的"${error[0]}"`, startLine, endLine: startLine, startCol, endCol: startCol + error.length,
			};
		});
	}
}

module.exports = AstText;
