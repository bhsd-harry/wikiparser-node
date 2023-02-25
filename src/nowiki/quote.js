'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	AstText = require('../../lib/text'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
class QuoteToken extends NowikiToken {
	type = 'quote';

	/**
	 * @param {number} n 字符串长度
	 * @param {accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super(`'`.repeat(n), config, accum);
	}

	/**
	 * @override
	 * @this {AstText}
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			/** @type {LintError[]} */ errors = [];
		let refError;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[, {length}] = previousSibling.data.match(/(?:^|[^'])('+)$/u),
				startIndex = start - length;
			errors.push({...refError, startIndex, endIndex, startCol: endCol - length, endLine, endCol});
		}
		if (nextSibling?.type === 'text' && nextSibling.data[0] === `'`) {
			refError ||= generateForSelf(this, {start}, message);
			const {endIndex: startIndex, endLine: startLine, endCol: startCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u),
				endIndex = startIndex + length;
			errors.push({...refError, startIndex, endIndex, startLine, startCol, endCol: startCol + length});
		}
		return errors;
	}
}

module.exports = QuoteToken;
