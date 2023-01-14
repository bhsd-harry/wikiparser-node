'use strict';

const {generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * 自由外链
 * @classdesc `{childNodes: [...AstText|CommentToken|IncludeToken|NoincludeToken]}`
 */
class MagicLinkToken extends Token {
	type = 'free-ext-link';

	/**
	 * @param {string} url 网址
	 * @param {boolean} doubleSlash 是否接受"//"作为协议
	 * @param {accum} accum
	 */
	constructor(url, doubleSlash, config = Parser.getConfig(), accum = []) {
		super(url, config, true, accum);
		if (doubleSlash) {
			this.type = 'ext-link-url';
		}
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		let /** @type {{top: number, left: number}} */ rect;
		for (const child of this.childNodes) {
			const str = String(child);
			if (child.type !== 'text' || !/[，；。：！？（）【】]/u.test(str)) {
				continue;
			}
			rect ||= this.getRootNode().posFromIndex(start);
			const refError = generateForChild(child, rect, 'URL中的全角标点', 'warning');
			errors.push(...[...str.matchAll(/[，；。：！？（）【】]/gu)].map(({index}) => {
				const lines = str.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines.at(-1),
					startLine = refError.startLine + top - 1,
					startCol = top > 1 ? left : refError.startCol + left;
				return {...refError, startLine, endLine: startLine, startCol, endCol: startCol + 1};
			}));
		}
		return errors;
	}

	/** 是否是模板或魔术字参数 */
	isParamValue() {
		const ParameterToken = require('./parameter');
		const /** @type {ParameterToken} */ parameter = this.closest('parameter');
		return parameter?.getValue() === this.text();
	}
}

module.exports = MagicLinkToken;
