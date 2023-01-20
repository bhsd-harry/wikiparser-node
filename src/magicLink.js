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
		super(url, config, true, accum, {
		});
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
			const refError = generateForChild(child, rect, 'URL中的全角标点', 'warning'),
				regex = /[，；。：！？（）【】]/gu;
			for (let mt = regex.exec(str); mt; mt = regex.exec(str)) {
				const {index} = mt,
					lines = str.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines[top - 1],
					startLine = refError.startLine + top - 1,
					startCol = top > 1 ? left : refError.startCol + left,
					excerpt = str.slice(Math.max(0, index - 25), index + 25);
				errors.push({...refError, startLine, endLine: startLine, startCol, endCol: startCol + 1, excerpt});
			}
		}
		return errors;
	}
}

module.exports = MagicLinkToken;
