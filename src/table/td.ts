import {generateForChild} from '../../util/lint';
import * as Parser from '../../index';
import {Token} from '../index';
import {TableBaseToken} from './base';
import type {LintError} from '../../base';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

export type TdSubtypes = 'td' | 'th' | 'caption';
declare interface TdSyntax {
	subtype: TdSubtypes;
}
export interface TdSpanAttrs {
	rowspan?: number;
	colspan?: number;
}
export type TdAttrs = Record<string, string | true> & TdSpanAttrs;

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
// @ts-expect-error not implementing all abstract methods
export class TdToken extends fixed(TableBaseToken) {
	override readonly type = 'td';
	#innerSyntax = '';

	declare childNodes: [SyntaxToken, AttributesToken, Token];
	// @ts-expect-error abstract method
	abstract override get parentNode(): TrToken | TableToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): Token | undefined;

	/** 单元格类型 */
	get subtype(): TdSubtypes {
		return this.#getSyntax().subtype;
	}

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		let innerSyntax = /\||\0\d+!\x7F/u.exec(inner ?? ''),
			attr = innerSyntax ? inner!.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(
			/^(?:\n[^\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u,
			syntax,
			attr,
			config,
			accum,
		);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax as [string];
		}
		const innerToken = new Token(
			inner?.slice((innerSyntax?.index ?? NaN) + this.#innerSyntax.length),
			config,
			accum,
		);
		innerToken.type = 'td-inner';
		innerToken.setAttribute('stage', 4);
		this.insertAt(innerToken);
	}

	/** 表格语法信息 */
	#getSyntax(): TdSyntax {
		const syntax = this.firstChild.text(),
			char = syntax.at(-1)!;
		let subtype: TdSubtypes = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		return result;
	}

	/** @private */
	override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, 'string');
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return omit && this.matchesTypes(omit)
			? ''
			: `${syntax.toString(omit)}${attr.toString(omit)}${this.#innerSyntax}${inner.toString(omit)}`;
	}

	/** @override */
	override text(): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/** @private */
	protected override getGaps(i: number): number {
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		start += this.getRelativeIndex(this.length - 1);
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text' && child.data.includes('|')) {
				errors.push(generateForChild(child, {start}, 'additional "|" in a table cell', 'warning'));
			}
		}
		return errors;
	}

	/** @override */
	override print(): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}
}
