import {generateForChild, generateForSelf} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixed} from '../mixin/fixed';
import {sol} from '../mixin/sol';
import * as Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {LintError} from '../base';

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
export class HeadingToken extends sol(fixed(Token)) {
	override readonly type = 'heading';
	#level;

	declare readonly childNodes: [Token, SyntaxToken];
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

	/** @throws `RangeError` 首尾包含`=` */
	set innerText(text) {
		if (text.length > 1 && text.startsWith('=') && text.endsWith('=')) {
			throw new RangeError(`修改标题层级请使用 ${this.constructor.name}.setLevel 方法！`);
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
	override toString(omit?: Set<string>): string {
		const equals = this.#equals;
		return omit && this.matchesTypes(omit)
			? ''
			: `${this.prependNewLine()}${equals}${
				this.firstChild.toString(omit)
			}${equals}${this.lastChild.toString(omit)}`;
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
	protected override getGaps(): number {
		return this.level;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{firstChild} = this,
			innerStr = String(firstChild);
		const equals = this.#equals,
			excerpt = `${equals}${innerStr}${equals}`.slice(0, 50);
		let refError: LintError | undefined;
		if (this.level === 1) {
			refError = {...generateForChild(firstChild, {start}, '<h1>'), excerpt};
			errors.push(refError);
		}
		if (innerStr.startsWith('=') || innerStr.endsWith('=')) {
			refError ??= {...generateForChild(firstChild, {start}, ''), excerpt};
			errors.push({...refError, message: Parser.msg('unbalanced "=" in a section header')});
		}
		if (this.closest('html-attrs, table-attrs')) {
			errors.push({...generateForSelf(this, {start}, ''), message: Parser.msg('section header in a HTML tag')});
		}
		return errors;
	}

	/** @override */
	override print(): string {
		const equals = this.#equals;
		return super.print({pre: equals, sep: equals});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [title, trail] = this.cloneChildNodes() as [Token, SyntaxToken];
		return Shadow.run(() => {
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
