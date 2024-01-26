import {generateForChild, generateForSelf} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';
import {sol} from '../mixin/sol';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {LintError} from '../base';
import type {SolTokenBase} from '../mixin/sol';
import type {QuoteToken} from '../internal';

export interface HeadingToken extends SolTokenBase {}

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
export abstract class HeadingToken extends sol(fixedToken(Token)) {
	override readonly type = 'heading';
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get children(): [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get firstElementChild(): Token;
	abstract override get lastChild(): SyntaxToken;
	abstract override get lastElementChild(): SyntaxToken;

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
		return this.firstChild.text();
	}

	/** @throws `Error` 首尾包含`=` */
	set innerText(text) {
		if (text.length > 1 && text.startsWith('=') && text.endsWith('=')) {
			throw new Error('修改标题层级请使用 setLevel 方法！');
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
		return `${this.prependNewLine()}${equals}${String(this.firstChild)}${equals}${String(this.lastChild)}`;
	}

	/** @override */
	override text(): string {
		const equals = this.#equals;
		return `${this.prependNewLine()}${equals}${this.firstChild.text()}${equals}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding'
			? super.getAttribute('padding') + this.level as TokenAttributeGetter<T>
			: super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return this.level;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{firstChild, level} = this,
			innerStr = String(firstChild),
			quotes = firstChild.childNodes.filter((node): node is QuoteToken => node.type === 'quote'),
			boldQuotes = quotes.filter(({bold}) => bold),
			italicQuotes = quotes.filter(({italic}) => italic);
		let rect: BoundingRect | undefined;
		if (this.level === 1) {
			rect = {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(firstChild, rect, '<h1>'));
		}
		if (innerStr.startsWith('=') || innerStr.endsWith('=')) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(firstChild, rect, Parser.msg('unbalanced $1 in a section header', '"="')));
		}
		if (this.closest('html-attrs, table-attrs')) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForSelf(this, rect, 'section header in a HTML tag'));
		}
		if (boldQuotes.length % 2) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(
				boldQuotes[boldQuotes.length - 1]!,
				{...rect, start: start + level, left: rect.left + level},
				Parser.msg('unbalanced $1 in a section header', 'bold apostrophes'),
			));
		}
		if (italicQuotes.length % 2) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(
				italicQuotes[italicQuotes.length - 1]!,
				{start: start + level},
				Parser.msg('unbalanced $1 in a section header', 'italic apostrophes'),
			));
		}
		return errors;
	}

	/** @override */
	override print(): string {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			level: this.level,
		};
	}

	/* NOT FOR BROWSER */

	/** @override */
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
}

classes['HeadingToken'] = __filename;
