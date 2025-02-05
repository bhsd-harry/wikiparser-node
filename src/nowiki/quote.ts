import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
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
			rect = new BoundingRect(this, start),
			refError = generateForSelf(this, rect, 'lonely-apos', message, 'error', true);

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
		): LintError.Fix[] => [
			{desc: 'escape', range: [startIndex, endIndex], text: '&apos;'.repeat(length)},
			{desc: 'remove', range: [startIndex, endIndex], text: ''},
		];
		if (previousSibling?.type === 'text' && previousSibling.data.endsWith(`'`)) {
			const {startIndex: endIndex, startLine, startCol: endCol} = refError,
				[, {length}] = /(?:^|[^'])('+)$/u.exec(previousSibling.data) as string[] as [string, string],
				startIndex = start - length;
			errors.push({
				...refError,
				startIndex,
				endIndex,
				startLine,
				endLine: startLine,
				startCol: endCol - length,
				endCol,
				suggestions: getSuggestion(startIndex, endIndex, length),
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			const {endIndex: startIndex, endLine, endCol: startCol} = refError,
				[{length}] = /^'+/u.exec(nextSibling.data)!,
				endIndex = startIndex + length;
			errors.push({
				...refError,
				startIndex,
				endIndex,
				startLine: endLine,
				endLine,
				startCol,
				endCol: startCol + length,
				suggestions: getSuggestion(startIndex, endIndex, length),
			});
		}
		if (bold && this.closest('heading-title')) {
			errors.push({
				...generateForSelf(this, rect, 'bold-header', 'bold in section header', 'warning'),
				suggestions: [{desc: 'remove', range: [start, start + 3], text: ''}],
			});
		}
		return errors;
	}
}
