import {generateForSelf} from '../../util/lint';
import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';

/** `''`和`'''` */
// @ts-expect-error not implementing all abstract methods
export class QuoteToken extends syntax(NowikiBaseToken, /^(?:'{5}|'''?)$/u) {
	override readonly type = 'quote';

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {previousSibling, nextSibling} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors: LintError[] = [];
		let refError: LintError | undefined;
		let wikitext: string | undefined;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			wikitext = String(this.getRootNode());
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[{length}] = /(?<!')'+$/u.exec(previousSibling.data)!,
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
				[{length}] = /^'+/u.exec(nextSibling.data)!,
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

classes['QuoteToken'] = __filename;
