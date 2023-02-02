'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax'),
	AttributesToken = require('../attributes');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
class TrToken extends Token {
	type = 'tr';

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {accum} accum
	 * @param {RegExp} pattern 表格语法正则
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = undefined) {
		super(undefined, config, true, accum, {
		});
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
			}),
			new AttributesToken(attr, 'table-attrs', this.type, config, accum),
		);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const TranscludeToken = require('../transclude'),
			ArgToken = require('../arg');
		const errors = super.lint(start),
			inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const /** @type {TranscludeToken & ArgToken} */ first = inter.childNodes.find(child => child.text().trim()),
			tdPattern = /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u;
		if (!first || tdPattern.test(String(first)) || first.type === 'arg' && tdPattern.test(first.default || '')) {
			return errors;
		} else if (first.type === 'magic-word') {
			try {
				const possibleValues = first.getPossibleValues();
				if (possibleValues.every(token => tdPattern.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(inter, {start}, '将被移出表格的内容');
		errors.push({
			...error,
			startIndex: error.startIndex + 1,
			startLine: error.startLine + 1,
			startCol: 0,
		});
		return errors;
	}

	/** @override */
	text() {
		const str = super.text();
		return this.type === 'tr' && !str.trim().includes('\n') ? '' : str;
	}
}

module.exports = TrToken;
