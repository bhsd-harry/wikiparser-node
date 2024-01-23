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

	/** 是否粗体 */
	get bold(): boolean {
		return this.innerText.length !== 2;
	}

	/** 是否斜体 */
	get italic(): boolean {
		return this.innerText.length !== 3;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {previousSibling, nextSibling, bold} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors: LintError[] = [];
		let refError: LintError | undefined;
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, {start}, message);
			const {startIndex: endIndex, startLine: endLine, startCol: endCol} = refError,
				[, {length}] = /(?:^|[^'])('+)$/u.exec(previousSibling.data) as string[] as [string, string],
				startIndex = start - length;
			errors.push({
				...refError,
				startIndex,
				endIndex,
				startCol: endCol - length,
				endLine,
				endCol,
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, {start}, message);
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
			});
		}
		if (bold && this.closest('heading-title')) {
			refError ??= generateForSelf(this, {start}, message);
			errors.push({
				...refError,
				message: Parser.msg('bold in section header'),
				severity: 'warning',
			});
		}
		return errors;
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			bold: this.bold,
			italic: this.italic,
		};
	}
}

classes['QuoteToken'] = __filename;
