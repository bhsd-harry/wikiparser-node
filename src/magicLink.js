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
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`;
		let /** @type {{top: number, left: number}} */ rect;
		for (const child of this.childNodes) {
			const str = String(child);
			if (child.type !== 'text' || !new RegExp(source, 'u').test(str)) {
				continue;
			}
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			const refError = generateForChild(child, rect, '', 'warning'),
				regex = new RegExp(source, 'gu');
			for (let mt = regex.exec(str); mt; mt = regex.exec(str)) {
				const {index, 0: {0: char, length}} = mt,
					lines = str.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines[top - 1],
					startIndex = start + index,
					startLine = refError.startLine + top - 1,
					startCol = (top > 1 ? 0 : refError.startCol) + left;
				errors.push({
					...refError,
					message: `URL中的${char === '|' ? '"|"' : '全角标点'}`,
					startIndex,
					endIndex: startIndex + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: str.slice(Math.max(0, index - 25), index + 25),
				});
			}
		}
		return errors;
	}

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
}

module.exports = MagicLinkToken;
