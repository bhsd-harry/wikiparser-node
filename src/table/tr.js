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
		const errors = super.lint(start),
			inter = this.childNodes.find(({type}) => type === 'table-inter'),
			str = String(inter).trim();
		if (inter && str && !/^<!--.*-->$/su.test(str)) {
			const error = generateForChild(inter, this.getRootNode().posFromIndex(start), '将被移出表格的内容');
			error.startLine++;
			error.startCol = 0;
			errors.push(error);
		}
		return errors;
	}
}

module.exports = TrToken;
