'use strict';
const lint_1 = require('../../util/lint');
const {generateForSelf} = lint_1;
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** `''`和`'''` */
class QuoteToken extends NowikiBaseToken {
	/** @browser */
	type = 'quote';

	/**
	 * @browser
	 * @param n 字符串长度
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super(`'`.repeat(n), config, accum);
		this.setAttribute('name', String(n));
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors = [];
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
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, {start}, message);
			wikitext ??= String(this.getRootNode());
			const {endIndex: startIndex, endLine: startLine, endCol: startCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u),
				endIndex = startIndex + length,
				excerpt = wikitext.slice(Math.max(0, endIndex - 50), endIndex);
			errors.push({...refError, startIndex, endIndex, startLine, startCol, endCol: startCol + length, excerpt});
		}
		return errors;
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new QuoteToken(Number(this.name), this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param str 新文本
	 * @throws `RangeError` 错误的单引号语法
	 */
	setText(str) {
		if (str === `''` || str === `'''` || str === `'''''`) {
			return super.setText(str);
		}
		throw new RangeError(`${this.constructor.name} 的内部文本只能为连续 2/3/5 个"'"！`);
	}
}
Parser.classes.QuoteToken = __filename;
module.exports = QuoteToken;
