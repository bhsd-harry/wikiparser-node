import {generateForChild, generateForSelf} from '../util/lint';
import {
	isToken,
} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {QuoteToken, AstText} from '../internal';

/**
 * section heading
 *
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
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
		const trail = new SyntaxToken(input[1], /^\s*$/u, 'heading-trail', config, accum, {
		});
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
		const errors = super.lint(start, re),
			{firstChild, level} = this,
			innerStr = firstChild.toString(),
			unbalancedStart = innerStr.startsWith('='),
			unbalanced = unbalancedStart || innerStr.endsWith('='),
			quotes = firstChild.childNodes.filter(isToken<QuoteToken>('quote')),
			boldQuotes = quotes.filter(({bold}) => bold),
			italicQuotes = quotes.filter(({italic}) => italic),
			rect = new BoundingRect(this, start);
		if (this.level === 1) {
			const e = generateForChild(firstChild, rect, 'h1', '<h1>');
			if (!unbalanced) {
				e.suggestions = [{desc: 'h2', range: [e.startIndex, e.endIndex], text: `=${innerStr}=`}];
			}
			errors.push(e);
		}
		if (unbalanced) {
			const e = generateForChild(
				firstChild,
				rect,
				'unbalanced-header',
				Parser.msg('unbalanced $1 in a section header', '"="'),
			);
			if (innerStr === '=') {
				//
			} else if (unbalancedStart) {
				const [extra] = /^=+/u.exec(innerStr)!;
				e.suggestions = [
					{desc: `h${level}`, range: [e.startIndex, e.startIndex + extra.length], text: ''},
					{desc: `h${level + extra.length}`, range: [e.endIndex, e.endIndex], text: extra},
				];
			} else {
				const extra = /[^=](=+)$/u.exec(innerStr)![1]!;
				e.suggestions = [
					{desc: `h${level}`, range: [e.endIndex - extra.length, e.endIndex], text: ''},
					{desc: `h${level + extra.length}`, range: [e.startIndex, e.startIndex], text: extra},
				];
			}
			errors.push(e);
		}
		if (this.closest('html-attrs,table-attrs')) {
			errors.push(generateForSelf(this, rect, 'parsing-order', 'section header in an HTML tag'));
		}
		const rootStr = this.getRootNode().toString();
		if (boldQuotes.length % 2) {
			const e = generateForChild(
					boldQuotes[boldQuotes.length - 1]!,
					// eslint-disable-next-line @typescript-eslint/no-misused-spread
					{...rect, start: start + level, left: rect.left + level},
					'format-leakage',
					Parser.msg('unbalanced $1 in a section header', 'bold apostrophes'),
				),
				end = start + level + innerStr.length;
			if (rootStr.slice(e.endIndex, end).trim()) {
				e.suggestions = [{desc: 'close', range: [end, end], text: "'''"}];
			} else {
				e.fix = {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
			}
			errors.push(e);
		}
		if (italicQuotes.length % 2) {
			const e = generateForChild(
					italicQuotes[italicQuotes.length - 1]!,
					{start: start + level},
					'format-leakage',
					Parser.msg('unbalanced $1 in a section header', 'italic apostrophes'),
				),
				end = start + level + innerStr.length;
			e.fix = rootStr.slice(e.endIndex, end).trim()
				? {desc: 'close', range: [end, end], text: "''"}
				: {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
			errors.push(e);
		}
		return errors;
	}

	/** @private */
	override print(): string {
		const equals = this.#getEquals();
		return super.print({pre: equals, sep: equals});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['level'] = this.level;
		return json;
	}
}
