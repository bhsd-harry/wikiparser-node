import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
	Config,
	AST,
} from '../../base';
import type {Font} from '../../lib/node';
import type {Token, ImageParameterToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';
import {syntax} from '../../mixin/syntax';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * `''` and `'''`
 *
 * `''`和`'''`
 */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
	#closing: Font;

	override get type(): 'quote' {
		return 'quote';
	}

	override get bold(): boolean {
		return this.innerText.length !== 2;
	}

	override get italic(): boolean {
		return this.innerText.length !== 3;
	}

	/**
	 * whether to be closing quotes
	 *
	 * 是否闭合
	 * @since v1.16.5
	 */
	get closing(): Partial<Font> {
		return {
			...this.bold ? {bold: this.#closing.bold} : undefined,
			...this.italic ? {italic: this.#closing.italic} : undefined,
		};
	}

	/* NOT FOR BROWSER */

	override get font(): Font {
		return {bold: this.bold, italic: this.italic};
	}

	/* NOT FOR BROWSER END */

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
		const {previousSibling, bold, closing} = this,
			previousData = previousSibling?.type === 'text' ? previousSibling.data : undefined,
			errors: LintError[] = [],
			rect = new BoundingRect(this, start),
			rules = ['lonely-apos', 'bold-header'] as const,
			severities = [undefined, 'word'].map(key => Parser.lintConfig.getSeverity(rules[0], key)),
			s = Parser.lintConfig.getSeverity(rules[1]);
		if (previousData?.endsWith(`'`)) {
			const severity = severities[(closing.bold || closing.italic) && /[a-z\d]'$/iu.test(previousData) ? 1 : 0];
			if (severity) {
				const e = generateForSelf(this, rect, rules[0], Parser.msg('lonely "$1"', `'`), severity),
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
					suggestions: [
						{desc: 'escape', range: [startIndex, endIndex], text: '&apos;'.repeat(length)},
						{desc: 'remove', range: [startIndex, endIndex], text: ''},
					],
				});
			}
		}
		if (s && bold && this.closest('heading-title')) {
			const e = generateForSelf(this, rect, rules[1], 'bold in section header', s);
			e.suggestions = [{desc: 'remove', range: [start, start + 3], text: ''}];
			errors.push(e);
		}
		return errors;
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		Object.assign(json, {bold: this.bold, italic: this.italic});
		return json;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): this => new QuoteToken(this.innerText, this.#closing, this.getAttribute('config')),
		);
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {closing: {bold, italic}} = this;
		return (bold ? '</b>' : '') + (italic ? '</i>' : '')
			+ (italic === false ? '<i>' : '') + (bold === false ? '<b>' : '');
	}
}

classes['QuoteToken'] = __filename;
