import {generateForSelf} from '../util/lint';
import {fixed} from '../mixin/fixed';
import {sol} from '../mixin/sol';
import * as Parser from '../index';
import {Token} from '.';
import {SyntaxToken} from './syntax';
import type {LintError} from '../index';

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
export class HeadingToken extends sol(fixed(Token)) {
	/** @browser */
	override readonly type = 'heading';
	declare name: string;
	declare childNodes: [Token, SyntaxToken];
	// @ts-expect-error abstract method
	abstract override get children(): [Token, SyntaxToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): Token;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastChild(): SyntaxToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): SyntaxToken;

	/**
	 * 标题层级
	 * @browser
	 */
	get level(): number {
		return Number(this.name);
	}

	/** @throws `RangeError` 标题层级应为 1 - 6 之间的整数 */
	set level(n) {
		this.setLevel(n);
	}

	/**
	 * 标题格式的等号
	 * @browser
	 */
	get #equals(): string {
		return '='.repeat(this.level);
	}

	/** 内部wikitext */
	get innerText(): string {
		return this.firstChild.text();
	}

	/**
	 * @browser
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: [string?, string?], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.append(token, trail);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const equals = this.#equals;
		return omit && this.matchesTypes(omit)
			? ''
			: `${this.prependNewLine()}${equals}${
				this.firstChild.toString(omit)
			}${equals}${this.lastChild.toString(omit)}`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		const equals = this.#equals;
		return `${this.prependNewLine()}${equals}${this.firstChild.text()}${equals}`;
	}

	/** @private */
	override getPadding(): number {
		return super.getPadding() + this.level;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 ? this.level : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			innerStr = String(this.firstChild);
		let refError: LintError | undefined;
		if (this.name === '1') {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (innerStr.startsWith('=') || innerStr.endsWith('=')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({...refError, message: Parser.msg('unbalanced "=" in a section header')});
		}
		if (this.closest('html-attrs, table-attrs')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({...refError, message: Parser.msg('section header in a HTML tag')});
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}

	/** @override */
	override cloneNode(): this {
		const [title, trail] = this.cloneChildNodes() as [Token, SyntaxToken];
		return Parser.run(() => {
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
		this.setAttribute('name', String(Math.min(Math.max(n, 1), 6)));
	}

	/** 移除标题后的不可见内容 */
	removeTrail(): void {
		this.lastChild.replaceChildren();
	}
}

Parser.classes['HeadingToken'] = __filename;
