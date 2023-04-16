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
	lint(start) {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let /** @type {{top: number, left: number}} */ rect;
		for (const child of this.childNodes) {
			const str = String(child);
			if (child.type !== 'text' || !regex.test(str)) {
				continue;
			}
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			const refError = generateForChild(child, rect, '', 'warning');
			regexGlobal.lastIndex = 0;
			for (let mt = regexGlobal.exec(str); mt; mt = regexGlobal.exec(str)) {
				const {index, 0: {0: char, length}} = mt,
					lines = str.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines[top - 1],
					startIndex = start + index,
					startLine = refError.startLine + top - 1,
					startCol = (top > 1 ? 0 : refError.startCol) + left;
				errors.push({
					...refError,
					message: Parser.msg('$1 in URL', char === '|' ? '"|"' : Parser.msg('full-width punctuation')),
					startIndex,
					endIndex: startIndex + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
				});
			}
		}
		return errors;
	}

	/**
	 * @param {string} url 网址
	 * @param {boolean} doubleSlash 是否接受"//"作为协议
	 * @param {Token} accum
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
