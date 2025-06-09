import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	Config,
} from '../../base';
import type {Font} from '../../lib/node';
import type {Token, ImageParameterToken} from '../../internal';

/**
 * `''` and `'''`
 *
 * `''`和`'''`
 */
export abstract class QuoteToken extends NowikiBaseToken {
	#closing: Font;

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

	/** whether to be closing quotes / 是否闭合 */
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

	/** @private */
	override text(): string {
		const {parentNode, innerText} = this;
		return parentNode?.is<ImageParameterToken>('image-parameter') && parentNode.name !== 'caption'
			? ''
			: innerText;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {previousSibling, nextSibling, bold, closing} = this,
			previousData = previousSibling?.type === 'text' ? previousSibling.data : undefined,
			nextData = nextSibling?.type === 'text' ? nextSibling.data : undefined,
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
		if (previousData?.endsWith(`'`)) {
			const e = generateForSelf(
					this,
					rect,
					'lonely-apos',
					message,
					(closing.bold || closing.italic)
					&& (/[a-z\d]'$/iu.test(previousData) || nextData && /^[a-z\d]/iu.test(nextData))
						? 'warning'
						: 'error',
				),
				{startIndex: endIndex, startLine: endLine, startCol: endCol} = e,
				[, {length}] = /(?:^|[^'])('+)$/u.exec(previousData) as string[] as [string, string],
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
		if (nextData?.startsWith(`'`)) {
			const e = generateForSelf(this, rect, 'lonely-apos', message),
				{endIndex: startIndex, endLine: startLine, endCol: startCol} = e,
				[{length}] = /^'+/u.exec(nextData)!,
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
			const e = generateForSelf(
				this,
				rect,
				'bold-header',
				'bold in section header',
				'warning',
			);
			e.suggestions = [{desc: 'remove', range: [start, start + 3], text: ''}];
			errors.push(e);
		}
		return errors;
	}
}
