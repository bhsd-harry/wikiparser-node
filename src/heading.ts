import {generateForChild, generateForSelf} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {
	isToken,

	/* NOT FOR BROWSER */

	Shadow,
} from '../util/debug';
import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';
import {sol} from '../mixin/sol';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	LintError,
	AST,
} from '../base';
import type {QuoteToken} from '../internal';

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
@fixedToken @sol
export abstract class HeadingToken extends Token {
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): SyntaxToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [Token, SyntaxToken];
	abstract override get firstElementChild(): Token;
	abstract override get lastElementChild(): SyntaxToken;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	set level(n) {
		this.setLevel(n);
	}

	/** 内部wikitext */
	get innerText(): string {
		return this.firstChild.text().trim();
	}

	/** @throws `Error` 首尾包含`=` */
	set innerText(text) {
		if (text.length > 1 && text.startsWith('=') && text.endsWith('=')) {
			throw new Error('Please use HeadingToken.setLevel method to change the level of the heading!');
		}
		const {childNodes} = Parser.parse(text, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.firstChild.replaceChildren(...childNodes);
	}

	/* NOT FOR BROWSER END */

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
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.append(token, trail);
	}

	/** @private */
	override toString(): string {
		const equals = this.#equals;
		return equals + this.firstChild.toString() + equals + this.lastChild.toString();
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
		if (this.closest('html-attrs, table-attrs')) {
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

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [title, trail] = this.cloneChildNodes() as [Token, SyntaxToken];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new HeadingToken(this.level, [], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(title);
			token.lastChild.safeReplaceWith(trail);
			return token;
		});
	}

	/**
	 * 设置标题层级
	 * @param n 标题层级
	 */
	setLevel(n: number): void {
		this.#level = Math.min(Math.max(n, 1), 6);
	}

	/** 移除标题后的不可见内容 */
	removeTrail(): void {
		this.lastChild.replaceChildren();
	}

	/** @private */
	override toHtml(): string {
		const {level, firstChild} = this,
			html = firstChild.toHtml();
		return `<div class="mw-heading mw-heading${level}"><h${level} id="${
			html.replace(/<[a-z].*?>/gu, '').replace(/[\s_]+/gu, '_')
		}">${html}</h${level}></div>`;
	}
}

classes['HeadingToken'] = __filename;
