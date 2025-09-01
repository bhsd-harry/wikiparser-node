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
		LINT: { // eslint-disable-line no-unused-labels
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
			if (s && bold && this.closest('heading-title,ext')?.type === 'heading-title') {
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
		const json = super.json(undefined, start);
		LSP: { // eslint-disable-line no-unused-labels
			Object.assign(json, {bold: this.bold, italic: this.italic});
			return json;
		}
	}
}
