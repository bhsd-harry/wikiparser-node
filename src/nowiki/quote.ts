import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	AST,
} from '../../base';

/** `''`和`'''` */
export abstract class QuoteToken extends NowikiBaseToken {
	override get type(): 'quote' {
		return 'quote';
	}

	/** 是否粗体 */
	get bold(): boolean {
		return this.innerText.length !== 2;
	}

	/** 是否斜体 */
	get italic(): boolean {
		return this.innerText.length !== 3;
	}

	/** @private */
	override text(): string {
		const {parentNode, innerText} = this;
		return parentNode?.type === 'image-parameter' && parentNode.name !== 'caption' ? '' : innerText;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {previousSibling, nextSibling, bold} = this,
			message = Parser.msg('lonely "$1"', `'`),
			errors: LintError[] = [],
			rect = new BoundingRect(this, start);
		let refError: LintError | undefined;

		/**
		 * 获取建议
		 * @param startIndex 起点
		 * @param endIndex 终点
		 * @param length 长度
		 */
		const getSuggestion = (
			startIndex: number,
			endIndex: number,
			length: number,
		): LintError.Fix & {desc: string} => ({
			desc: 'escape',
			range: [startIndex, endIndex],
			text: '&apos;'.repeat(length),
		});
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			refError = generateForSelf(this, rect, 'lonely-apos', message);
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
				suggestions: [getSuggestion(startIndex, endIndex, length)],
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			refError ??= generateForSelf(this, rect, 'lonely-apos', message);
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
				suggestions: [getSuggestion(startIndex, endIndex, length)],
			});
		}
		if (bold && this.closest('heading-title')) {
			errors.push(generateForSelf(this, rect, 'bold-header', 'bold in section header', 'warning'));
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
