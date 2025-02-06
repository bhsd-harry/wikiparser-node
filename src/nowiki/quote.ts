import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	AST,
} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {font} from '../../util/html';
import {syntax} from '../../mixin/syntax';

/* NOT FOR BROWSER END */

/** `''`和`'''` */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
	override get type(): 'quote' {
		return 'quote';
	}

	override get bold(): boolean {
		return this.innerText.length !== 2;
	}

	override get italic(): boolean {
		return this.innerText.length !== 3;
	}

	/* NOT FOR BROWSER */

	override get font(): {bold: boolean, italic: boolean} {
		return {bold: this.bold, italic: this.italic};
	}

	/* NOT FOR BROWSER END */

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
			const e = generateForSelf(this, rect, 'lonely-apos', message),
				{startIndex: endIndex, startLine: endLine, startCol: endCol} = e,
				[, {length}] = /(?:^|[^'])('+)$/u.exec(previousSibling.data) as string[] as [string, string],
				startIndex = start - length;
			errors.push({
				...e,
				startIndex,
				endIndex,
				endLine,
				startCol: endCol - length,
				endCol,
				suggestions: getSuggestion(startIndex, endIndex, length),
			});
		}
		if (nextSibling?.type === 'text' && nextSibling.data.startsWith(`'`)) {
			const e = generateForSelf(this, rect, 'lonely-apos', message),
				{endIndex: startIndex, endLine: startLine, endCol: startCol} = e,
				[{length}] = /^'+/u.exec(nextSibling.data)!,
				endIndex = startIndex + length;
			errors.push({
				...e,
				startIndex,
				endIndex,
				startLine,
				startCol,
				endCol: startCol + length,
				suggestions: getSuggestion(startIndex, endIndex, length),
			});
		}
		if (bold && this.closest('heading-title')) {
			const e = generateForSelf(this, rect, 'bold-header', 'bold in section header', 'warning');
			e.suggestions = [{desc: 'remove', range: [start, start + 3], text: ''}];
			errors.push(e);
		}
		return errors;
	}

	/** @override */
	override json(): AST {
		const json = super.json();
		Object.assign(json, {bold: this.bold, italic: this.italic});
		return json;
	}

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlInternal(): string {
		const {previousVisibleSibling, nextVisibleSibling} = this;
		return (
			!previousVisibleSibling
			|| previousVisibleSibling.type === 'text' && previousVisibleSibling.data.includes('\n')
		)
		&& nextVisibleSibling?.type === 'text'
		&& nextVisibleSibling.data.startsWith('\n')
			? font(this)
			: '';
	}
}

classes['QuoteToken'] = __filename;
