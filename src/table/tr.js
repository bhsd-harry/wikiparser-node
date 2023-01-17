'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken]}`
 */
class TrToken extends Token {
	type = 'tr';

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {accum} accum
	 * @param {RegExp} pattern 表格语法正则
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = null) {
		super(undefined, config, true, accum, {Token: 2, SyntaxToken: 0, AttributeToken: 1, TdToken: '2:'});
		const AttributeToken = require('../attribute');
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			new AttributeToken(attr, 'table-attr', 'tr', config, accum),
		);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const TranscludeToken = require('../transclude');
		const errors = super.lint(start),
			/** @type {TranscludeToken} */ inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const first = inter.childNodes.find(child => child.text().trim());
		if (first?.type === 'magic-word') {
			try {
				const possibleValues = first.getPossibleValues();
				if (possibleValues.every(token => /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(inter, this.getRootNode().posFromIndex(start), '将被移出表格的内容');
		error.startLine++;
		error.startCol = 0;
		errors.push(error);
		return errors;
	}

	/** @override */
	text() {
		const str = super.text();
		return this.type === 'tr' && !str.trim().includes('\n') ? '' : str;
	}
}

module.exports = TrToken;
