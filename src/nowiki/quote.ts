import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {Token} from '..';

/** `''`和`'''` */
export abstract class QuoteToken extends NowikiBaseToken {
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
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors: LintError[] = [];
		let refError: LintError | undefined,
			wikitext: string | undefined;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			wikitext = String(this.getRootNode());
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[{length}] = previousSibling.data.match(/(?<!')'+$/u) as [string],
				startIndex = start - length;
			errors.push({
				...refError,
				startIndex,
				endIndex,
				startCol: endCol - length,
				endLine,
				endCol,
				excerpt: wikitext.slice(startIndex, startIndex + 50),
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, {start}, message);
			wikitext ??= String(this.getRootNode());
			const {endIndex: startIndex, endLine: startLine, endCol: startCol} = refError,
				[{length}] = nextSibling.data.match(/^'+/u) as [string],
				endIndex = startIndex + length;
			errors.push({
				...refError,
				startIndex,
				endIndex,
				startLine,
				startCol,
				endCol: startCol + length,
				excerpt: wikitext.slice(Math.max(0, endIndex - 50), endIndex),
			});
		}
		return errors;
	}
}
