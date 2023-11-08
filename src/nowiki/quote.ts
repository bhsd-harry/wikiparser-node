import {generateForSelf} from '../../util/lint';
import * as Parser from '../../index';
import NowikiBaseToken = require('./base');
import Token = require('..');

/** `''`和`'''` */
abstract class QuoteToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'quote';
	declare name: string;

	/**
	 * @browser
	 * @param n 字符串长度
	 */
	constructor(n: number, config = Parser.getConfig(), accum: Token[] = []) {
		super(`'`.repeat(n), config, accum);
		this.setAttribute('name', String(n));
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): Parser.LintError[] {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors: Parser.LintError[] = [];
		let refError: Parser.LintError | undefined,
			wikitext: string | undefined;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			wikitext = String(this.getRootNode());
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[{length}] = previousSibling.data.match(/(?<!')'+$/u) as [string],
				startIndex = start - length,
				excerpt = wikitext.slice(startIndex, startIndex + 50);
			errors.push({...refError, startIndex, endIndex, startCol: endCol - length, endLine, endCol, excerpt});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, {start}, message);
			wikitext ??= String(this.getRootNode());
			const {endIndex: startIndex, endLine: startLine, endCol: startCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u) as [string],
				endIndex = startIndex + length,
				excerpt = wikitext.slice(Math.max(0, endIndex - 50), endIndex);
			errors.push({...refError, startIndex, endIndex, startLine, startCol, endCol: startCol + length, excerpt});
		}
		return errors;
	}

	/** @override */
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Parser.run(() => new QuoteToken(Number(this.name), this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param str 新文本
	 * @throws `RangeError` 错误的单引号语法
	 */
	override setText(str: string): string {
		if (str === `''` || str === `'''` || str === `'''''`) {
			return super.setText(str);
		}
		throw new RangeError(`${this.constructor.name} 的内部文本只能为连续 2/3/5 个"'"！`);
	}
}

Parser.classes['QuoteToken'] = __filename;
export = QuoteToken;
