import {generateForSelf} from '../../util/lint';
import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	AST,
} from '../../base';

/** `''`和`'''` */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
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
			refError = generateForSelf(this, {start}, 'lonely-apos', message);
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
				suggestions: [
					{
						desc: 'escape',
						range: [startIndex, endIndex],
						text: '&apos;'.repeat(length),
					},
				],
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, {start}, 'lonely-apos', message);
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
				suggestions: [
					{
						desc: 'escape',
						range: [startIndex, endIndex],
						text: '&apos;'.repeat(length),
					},
				],
			});
		}
		if (bold && this.closest('heading-title')) {
			refError ??= generateForSelf(this, {start}, 'lonely-apos', message);
			errors.push({
				...refError,
				rule: 'bold-header',
				message: Parser.msg('bold in section header'),
				severity: 'warning',
			});
		}
		return errors;
	}

	/** @override */
	override json(): AST {
		const json = super.json();
		Object.assign(json, {bold: this.bold, italic: this.italic});
		return json;
	}
}

classes['QuoteToken'] = __filename;
