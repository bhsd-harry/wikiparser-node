'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute');

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
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.append(
			new SyntaxToken(syntax, 'table-syntax', config, accum),
			new AttributeToken(attr, 'table-attr', config, accum),
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
		if (inter && str && !/^<!--.*-->$/u.test(str)) {
			const error = generateForChild(inter, this.getRootNode().posFromIndex(start), '将被移出表格的内容');
			error.startLine++;
			error.startCol = 0;
			errors.push(error);
		}
		return errors;
	}
}

module.exports = TrToken;
