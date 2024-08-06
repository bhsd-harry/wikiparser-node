import {generateForChild, generateForSelf} from '../util/lint';
import {
	isToken,
} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	LintError,
	AST,
} from '../base';
import type {QuoteToken, AstText} from '../internal';

/**
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

	/** 标题格式的等号 */
	get #equals(): string {
		return '='.repeat(this.level);
	}

	/** 标题层级 */
	get level(): number {
		return this.#level;
	}

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: readonly [string?, string?], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		this.#level = level;
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^\s*$/u, 'heading-trail', config, accum, {
		});
		this.append(token, trail);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const equals = this.#equals;
		return equals + this.firstChild.toString(skip) + equals + this.lastChild.toString(skip);
	}

	/** @private */
	override text(): string {
		const equals = this.#equals;
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
			quotes = firstChild.childNodes.filter(isToken<QuoteToken>('quote')),
			boldQuotes = quotes.filter(({bold}) => bold),
			italicQuotes = quotes.filter(({italic}) => italic),
			rect = new BoundingRect(this, start);
		if (this.level === 1) {
			errors.push(generateForChild(firstChild, rect, 'h1', '<h1>'));
		}
		if (innerStr.startsWith('=') || innerStr.endsWith('=')) {
			errors.push(generateForChild(
				firstChild,
				rect,
				'unbalanced-header',
				Parser.msg('unbalanced $1 in a section header', '"="'),
			));
		}
		if (this.closest('html-attrs,table-attrs')) {
			errors.push(generateForSelf(this, rect, 'parsing-order', 'section header in a HTML tag'));
		}
		if (boldQuotes.length % 2) {
			errors.push(generateForChild(
				boldQuotes[boldQuotes.length - 1]!,
				{...rect, start: start + level, left: rect.left + level},
				'format-leakage',
				Parser.msg('unbalanced $1 in a section header', 'bold apostrophes'),
			));
		}
		if (italicQuotes.length % 2) {
			errors.push(generateForChild(
				italicQuotes[italicQuotes.length - 1]!,
				{start: start + level},
				'format-leakage',
				Parser.msg('unbalanced $1 in a section header', 'italic apostrophes'),
			));
		}
		return errors;
	}

	/** @private */
	override print(): string {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}

	/** @override */
	override json(): AST {
		const json = super.json();
		json['level'] = this.level;
		return json;
	}
}
