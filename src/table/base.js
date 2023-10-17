'use strict';
const attributesParent = require('../../mixin/attributesParent');
const Parser = require('../../index');
const Token = require('..');
const SyntaxToken = require('../syntax');
const AttributesToken = require('../attributes');

/**
 * 转义表格语法
 * @param syntax 表格语法节点
 */
const escapeTable = syntax => {
	const templates = {'{|': '(!', '|}': '!)', '||': '!!', '|': '!'},
		wikitext = syntax.childNodes.map(child => child.type === 'text'
			? String(child).replace(/\{\||\|\}|\|{1,2}/gu, p => `{{${templates[p]}}}`)
			: String(child)).join(''),
		token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
	syntax.replaceChildren(...token.childNodes);
};

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
class TableBaseToken extends attributesParent(Token, 1) {
	/**
	 * @browser
	 * @param pattern 表格语法正则
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(pattern, syntax, attr = '', config = Parser.getConfig(), accum = [], acceptable = {}) {
		super(undefined, config, true, accum, acceptable);
		this.append(new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
			'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
		}),
		new AttributesToken(attr, 'table-attrs', this.type, config, accum));
		this.protectChildren(0, 1);
	}

	/** @override */
	cloneNode() {
		const [syntax, attr, ...cloned] = this.cloneChildNodes();
		return Parser.run(() => {
			const {constructor} = this,
				token = new constructor(undefined, undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(syntax);
			token.childNodes[1].safeReplaceWith(attr);
			if (token.type === 'td') { // TdToken
				token.childNodes[2].safeReplaceWith(cloned[0]);
			} else {
				token.append(...cloned);
			}
			return token;
		});
	}

	/** 转义表格语法 */
	escape() {
		for (const child of this.childNodes) {
			if (child instanceof SyntaxToken) {
				escapeTable(child);
			} else if (child instanceof TableBaseToken) {
				child.escape();
			}
		}
	}

	/**
	 * 设置表格语法
	 * @param syntax 表格语法
	 * @param esc 是否需要转义
	 */
	setSyntax(syntax, esc = false) {
		const {firstChild} = this;
		firstChild.replaceChildren(syntax);
		if (esc) {
			escapeTable(firstChild);
		}
	}
}
Parser.classes.TableBaseToken = __filename;
module.exports = TableBaseToken;
