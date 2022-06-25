'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	TrToken = require('./tr'),
	SyntaxToken = require('../syntax');

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?(string|Token), ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	static openingPattern = /^(?:{\||{{{\s*!\s*}}|{{\s*\(!\s*}})$/;
	static closingPattern = /^\n[^\S\n]*(?:\|}|{{\s*!\s*}}}|{{\s*!\)\s*}})$/;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, TableToken.openingPattern);
		this.setAttribute('acceptable', {
			String: 2, Token: 2, SyntaxToken: [0, -1], AttributeToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i) {
		const previous = this.childNodes.at(i - 1),
			{closingPattern} = TableToken;
		if (token instanceof TrToken && token.type === 'td' && previous instanceof TrToken && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.appendChild(token);
		} else if (i === this.childNodes.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${token.toString().replaceAll('\n', '\\n')}`);
		}
		return super.insertAt(token, i);
	}

	close(syntax = '\n|}') {
		const config = this.getAttribute('config'),
			inner = Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastElementChild} = this;
		if (!TableToken.closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${syntax.replaceAll('\n', '\\n')}`);
		} else if (lastElementChild instanceof SyntaxToken) {
			lastElementChild.replaceChildren(...inner.childNodes);
		} else {
			Parser.running = true;
			const token = new SyntaxToken(undefined, TableToken.closingPattern, 'table-syntax', config, [], {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			});
			Parser.running = false;
			token.replaceChildren(...inner.childNodes);
			this.appendChild(token);
		}
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
