import {generateForSelf} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {LintError} from '../index';

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
export class HeadingToken extends Token {
	override readonly type = 'heading';
	declare name: string;

	declare childNodes: [Token, SyntaxToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastChild(): SyntaxToken;

	/** 标题格式的等号 */
	get #equals(): string {
		return '='.repeat(this.level);
	}

	/** 标题层级 */
	get level(): number {
		return Number(this.name);
	}

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: [string?, string?], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
		});
		this.append(token, trail);
	}

	/** @override */
	override toString(omit?: Set<string>): string {
		const equals = this.#equals;
		return `${equals}${this.firstChild.toString()}${equals}${this.lastChild.toString()}`;
	}

	/** @override */
	override text(): string {
		const equals = this.#equals;
		return `${equals}${this.firstChild.text()}${equals}`;
	}

	/** @private */
	override getPadding(): number {
		return super.getPadding() + this.level;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 ? this.level : 0;
	}

	/** @override */
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

	/** @override */
	override print(): string {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}
}
