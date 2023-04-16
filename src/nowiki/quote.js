'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
class QuoteToken extends NowikiToken {
	/** @type {'quote'} */ type = 'quote';

	/**
	 * @param {number} n 字符串长度
	 * @param {import('..')[]} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super(`'`.repeat(n), config, accum);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			/** @type {import('../..').LintError[]} */ errors = [];
		let refError, wikitext;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			wikitext = String(this.getRootNode());
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[{length}] = previousSibling.data.match(/(?<!')'+$/u),
				startIndex = start - length,
				excerpt = wikitext.slice(startIndex, startIndex + 50);
			errors.push({...refError, startIndex, endIndex, startCol: endCol - length, endLine, endCol, excerpt});
		}
		if (nextSibling?.type === 'text' && nextSibling.data[0] === `'`) {
			refError ||= generateForSelf(this, {start}, message);
			wikitext ||= String(this.getRootNode());
			const {endIndex: startIndex, endLine: startLine, endCol: startCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u),
				endIndex = startIndex + length,
				excerpt = wikitext.slice(Math.max(0, endIndex - 50), endIndex);
			errors.push({...refError, startIndex, endIndex, startLine, startCol, endCol: startCol + length, excerpt});
		}
		return errors;
	}
}

module.exports = QuoteToken;
