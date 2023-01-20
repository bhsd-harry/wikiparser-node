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
		let refError, wikitext;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith("'")) {
			refError = generateForSelf(this, {start}, message);
			wikitext = String(this.getRootNode());
			const {startLine, startCol} = refError,
				[, {length}] = previousSibling.data.match(/(?:^|[^'])('+)$/u),
				excerpt = wikitext.slice(start - length, start - length + 50);
			errors.push({...refError, startCol: startCol - length, endLine: startLine, endCol: startCol, excerpt});
		}
		if (nextSibling?.type === 'text' && nextSibling.data[0] === "'") {
			refError ||= generateForSelf(this, {start}, message);
			wikitext ||= String(this.getRootNode());
			const {endLine, endCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u),
				excerpt = wikitext.slice(Math.max(0, start + length - 50), start + length);
			errors.push({...refError, startLine: endLine, startCol: endCol, endCol: endCol + length, excerpt});
		}
		return errors;
	}
}

module.exports = QuoteToken;
