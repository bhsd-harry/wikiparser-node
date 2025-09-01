import {generateForChild, generateForSelf, fixBy, fixByRemove, fixByClose} from '../util/lint';
import {
	isToken,
} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	Config,
	LintError,
} from '../base';
import type {QuoteToken, AstText} from '../internal';

/**
 * section heading
 *
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
@noEscape
export abstract class HeadingToken extends Token {
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): SyntaxToken;
	abstract override get nextSibling(): AstText | undefined;

	override get type(): 'heading' {
		return 'heading';
	}

	/** level of the heading / 标题层级 */
	get level(): number {
		return this.#level;
	}

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: readonly [string?, string?], config: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		this.#level = level;
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(
			input[1],
			'heading-trail',
			config,
			accum,
		);
		this.append(token, trail);
	}

	/** 标题格式的等号 */
	#getEquals(): string {
		return '='.repeat(this.level);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.toString(skip) + equals + this.lastChild.toString(skip);
	}

	/** @private */
	override text(): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.text() + equals;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? this.level as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return this.level;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{firstChild, level} = this,
				innerStr = firstChild.toString(),
				unbalancedStart = innerStr.startsWith('='),
				unbalanced = unbalancedStart || innerStr.endsWith('='),
				rect = new BoundingRect(this, start),
				s = this.inHtmlAttrs(),
				rules = ['h1', 'unbalanced-header', 'format-leakage'] as const,
				{lintConfig} = Parser,
				severities = rules.map(rule => lintConfig.getSeverity(rule, 'apostrophe'));
			if (severities[0] && this.level === 1) {
				const e = generateForChild(firstChild, rect, rules[0], '<h1>', severities[0]);
				if (!unbalanced) {
					e.suggestions = [fixBy(e, 'h2', `=${innerStr}=`)];
				}
				errors.push(e);
			}
			if (severities[1] && unbalanced) {
				const msg = Parser.msg('unbalanced-in-section-header', '"="'),
					e = generateForChild(firstChild, rect, rules[1], msg, severities[1]);
				if (innerStr === '=') {
					//
				} else if (unbalancedStart) {
					const [extra] = /^=+/u.exec(innerStr)!,
						newLevel = level + extra.length;
					e.suggestions = [{desc: `h${level}`, range: [e.startIndex, e.startIndex + extra.length], text: ''}];
					if (newLevel < 7) {
						e.suggestions.push({desc: `h${newLevel}`, range: [e.endIndex, e.endIndex], text: extra});
					}
				} else {
					const extra = /[^=](=+)$/u.exec(innerStr)![1]!,
						newLevel = level + extra.length;
					e.suggestions = [{desc: `h${level}`, range: [e.endIndex - extra.length, e.endIndex], text: ''}];
					if (newLevel < 7) {
						e.suggestions.push({desc: `h${newLevel}`, range: [e.startIndex, e.startIndex], text: extra});
					}
				}
				errors.push(e);
			}
			if (s) {
				const rule = 'parsing-order',
					severity = lintConfig.getSeverity(rule, s === 2 ? 'heading' : 'templateInTable');
				if (severity) {
					errors.push(generateForSelf(this, rect, rule, 'header-in-html', severity));
				}
			}
			if (severities[2]) {
				const rootStr = this.getRootNode().toString(),
					quotes = firstChild.childNodes.filter(isToken<QuoteToken>('quote')),
					boldQuotes = quotes.filter(({bold}) => bold),
					italicQuotes = quotes.filter(({italic}) => italic);
				if (boldQuotes.length % 2) {
					const e = generateForChild(
							boldQuotes[boldQuotes.length - 1]!,
							{
								...rect, // eslint-disable-line @typescript-eslint/no-misused-spread
								start: start + level,
								left: rect.left + level,
							},
							rules[2],
							Parser.msg('unbalanced-in-section-header', 'bold-apostrophes'),
							severities[2],
						),
						end = start + level + innerStr.length,
						remove = fixByRemove(e);
					if (rootStr.slice(e.endIndex, end).trim()) {
						e.suggestions = [
							remove,
							fixByClose(end, `'''`),
						];
					} else if (boldQuotes.length === 1 && italicQuotes.length === 0) {
						e.fix = remove;
					} else {
						e.suggestions = [remove];
					}
					errors.push(e);
				}
				if (italicQuotes.length % 2) {
					const e = generateForChild(
							italicQuotes[italicQuotes.length - 1]!,
							{start: start + level},
							rules[2],
							Parser.msg('unbalanced-in-section-header', 'italic-apostrophes'),
							severities[2],
						),
						end = start + level + innerStr.length;
					if (rootStr.slice(e.endIndex, end).trim()) {
						e.suggestions = [fixByClose(end, `''`)];
					} else if (italicQuotes.length === 1 && boldQuotes.length === 0) {
						e.fix = fixByRemove(e);
					} else {
						e.suggestions = [fixByRemove(e)];
					}
					errors.push(e);
				}
			}
			return errors;
		}
	}
}
