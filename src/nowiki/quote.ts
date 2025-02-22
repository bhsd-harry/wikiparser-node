import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	AST,

	/* NOT FOR BROWSER */

	Config,
} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';
import {syntax} from '../../mixin/syntax';
import type {Font} from '../../lib/node';
import type {Token} from '../index';

/* NOT FOR BROWSER END */

/** `''`和`'''` */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
	/* NOT FOR BROWSER */

	#closing: Font;

	/* NOT FOR BROWSER END */

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

	override get font(): Font {
		return {bold: this.bold, italic: this.italic};
	}

	/** 是否闭合 */
	get closing(): Partial<Font> {
		return {
			...this.bold ? {bold: this.#closing.bold} : undefined,
			...this.italic ? {italic: this.#closing.italic} : undefined,
		};
	}

	/** @param closing 是否闭合 */
	constructor(wikitext: string, closing: Font, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.#closing = closing;
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

	override json(): AST {
		const json = super.json();
		Object.assign(json, {bold: this.bold, italic: this.italic});
		return json;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Shadow.run(() => new QuoteToken(this.innerText, this.#closing, this.getAttribute('config')) as this);
	}

	/** @private */
	override toHtmlInternal(): string {
		const {closing: {bold, italic}} = this;
		return (bold ? '</b>' : '') + (italic ? '</i>' : '')
			+ (italic === false ? '<i>' : '') + (bold === false ? '<b>' : '');
	}
}

classes['QuoteToken'] = __filename;
