import {generateForSelf, fixByRemove, fixByEscape} from '../../util/lint';
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
import type {AstRange} from '../../lib/range';
import type {SyntaxBase} from '../../mixin/syntax';

export interface QuoteToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * `''` and `'''`
 *
 * `''`和`'''`
 */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
	#closing: Font;

	/* NOT FOR BROWSER */

	#match: {bold?: QuoteToken, italic?: QuoteToken} = {};

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

	/**
	 * whether to be closing quotes
	 *
	 * 是否闭合
	 * @since v1.16.5
	 */
	get closing(): Partial<Font> {
		LINT: return {
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
		LINT: {
			const {previousSibling, bold, closing} = this,
				previousData = previousSibling?.type === 'text' ? previousSibling.data : undefined,
				errors: LintError[] = [],
				rect = new BoundingRect(this, start),
				rules = ['lonely-apos', 'bold-header'] as const,
				{lintConfig} = Parser,
				{computeEditInfo} = lintConfig,
				severities = [undefined, 'word'].map(key => lintConfig.getSeverity(rules[0], key)),
				s = lintConfig.getSeverity(rules[1]);
			if (previousData?.endsWith(`'`)) {
				const severity = severities[(closing.bold || closing.italic) && /[a-z\d]'$/iu.test(previousData) ? 1 : 0];
				if (severity) {
					const e = generateForSelf(this, rect, rules[0], Parser.msg('lonely', `'`), severity),
						{startLine: endLine, startCol: endCol} = e,
						[, {length}] = /(?:^|[^'])('+)$/u.exec(previousData) as string[] as [string, string],
						startIndex = start - length,
						eNew: LintError = {
							...e,
							startIndex,
							endIndex: start,
							endLine,
							startCol: endCol - length,
							endCol,
						};
					if (computeEditInfo) {
						eNew.suggestions = [
							fixByEscape(startIndex, '&apos;', length),
							fixByRemove(eNew),
						];
					}
					errors.push(eNew);
				}
			}
			if (s && bold && this.isInside('heading-title')) {
				const e = generateForSelf(this, rect, rules[1], 'bold-in-header', s);
				if (computeEditInfo) {
					e.suggestions = [fixByRemove(e)];
				}
				errors.push(e);
			}
			return errors;
		}
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start);
			Object.assign(json, {bold: this.bold, italic: this.italic});
			return json;
		}
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): this => new QuoteToken(this.innerText, this.#closing, this.getAttribute('config')),
		);
	}

	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'bold') {
			this.#match.bold = value as QuoteToken;
		} else if (key === 'italic') {
			this.#match.italic = value as QuoteToken;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {bold, italic} = this.closing;
		return (bold ? '</b>' : '') + (italic ? '</i>' : '')
			+ (italic === false ? '<i>' : '') + (bold === false ? '<b>' : '');
	}

	/**
	 * Find the matching apostrophes
	 *
	 * 搜索匹配的直引号
	 * @since v1.30.0
	 * @param type type of apostrophes to match / 匹配的直引号类型
	 * @throws `RangeError` ambiguous or wrong apostrophe type
	 */
	findMatchingQuote(type?: 'bold' | 'italic'): this | undefined {
		if (type) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (type !== 'bold' && type !== 'italic') {
				this.typeError('findMatchingQuote', "'bold'", "'italic'");
			} else if (!this[type]) {
				throw new RangeError(`Not ${type} apostrophes!`);
			}
		} else {
			const {bold, italic} = this;
			if (bold && italic) {
				throw new RangeError('Ambiguous apostrophe type to match!');
			}
			type = bold ? 'bold' : 'italic';
		}
		return this.#match[type] as this | undefined;
	}

	/**
	 * Try to get the range of bold/italic text
	 *
	 * 尝试获取粗体/斜体文本范围
	 * @param type type of apostrophes / 直引号类型
	 */
	getRange(type?: 'bold' | 'italic'): AstRange | undefined {
		const matched = this.findMatchingQuote(type),
			{parentNode} = this;
		if (matched && parentNode && matched.parentNode === parentNode) {
			const range = this.createRange(),
				{childNodes} = parentNode,
				i = childNodes.indexOf(this),
				j = childNodes.indexOf(matched);
			range.setStart(parentNode, Math.min(i, j) + 1);
			range.setEnd(parentNode, Math.max(i, j));
			return range;
		}
		return undefined;
	}
}

classes['QuoteToken'] = __filename;
