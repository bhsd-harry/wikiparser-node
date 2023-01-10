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
		super("'".repeat(n), config, accum);
	}

	/**
	 * @override
	 * @this {AstText}
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const {previousSibling, nextSibling} = this,
			message = `孤立的"'"`,
			/** @type {LintError[]} */ errors = [];
		let /** @type {LintError} */ refError;
		if (previousSibling?.type === 'text' && previousSibling.data.at(-1) === "'") {
			refError = generateForSelf(this, this.getRootNode().posFromIndex(start), '');
			const {startLine, startCol} = refError,
				[, {length}] = previousSibling.data.match(/(?:^|[^'])('+)$/u);
			errors.push({message, startLine, startCol: startCol - length, endLine: startLine, endCol: startCol});
		}
		if (nextSibling?.type === 'text' && nextSibling.data[0] === "'") {
			refError ||= generateForSelf(this, this.getRootNode().posFromIndex(start), '');
			const {endLine, endCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u);
			errors.push({message, startLine: endLine, startCol: endCol, endLine, endCol: endCol + length});
		}
		return errors;
	}
}

module.exports = QuoteToken;
