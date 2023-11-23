import {generateForChild} from '../../util/lint';
import {fixed} from '../../mixin/fixed';
import * as Parser from '../../index';
import {Token} from '../index';
import {TableBaseToken} from './base';
import type {LintError} from '../../index';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

export type TdSubtypes = 'td' | 'th' | 'caption';
declare interface TdSyntax {
	subtype: TdSubtypes;
	escape: boolean;
	correction: boolean;
}
declare type TdAttrGetter<T extends string> = T extends 'rowspan' | 'colspan' ? number : string | true | undefined;
declare type TdAttrSetter<T extends string> = T extends 'rowspan' | 'colspan' ? number : string | boolean;
export type TdAttrs = Record<string, string | true> & {rowspan?: number, colspan?: number};

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
	abstract override get children(): [SyntaxToken, AttributesToken, Token];
	// @ts-expect-error abstract method
	abstract override get parentNode(): TrToken | TableToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): TrToken | TableToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): this | TrToken | SyntaxToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): Token | undefined;

	/** 单元格类型 */
	get subtype(): TdSubtypes {
		return this.getSyntax().subtype;
	}

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		let innerSyntax = inner?.match(/\||\0\d+!\x7F/u),
			attr = innerSyntax ? inner!.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = undefined;
			attr = '';
		}
		super(
			/^(?:\n[^\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u,
			syntax,
			attr,
			config,
			accum,
			{SyntaxToken: 0, AttributesToken: 1, Token: 2},
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
		this.insertAt(innerToken.setAttribute('stage', 4));
	}

	/** @private */
	protected getSyntax(): TdSyntax {
		const syntax = this.firstChild.text(),
			esc = syntax.includes('{{'),
			char = syntax.at(-1)!;
		let subtype: TdSubtypes = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {subtype, escape: esc, correction: false};
		}
		const {previousSibling} = this;
		if (!(previousSibling instanceof TdToken)) {
			return {subtype, escape: esc, correction: true};
		}
		const result = previousSibling.getSyntax();
		result.escape ||= esc;
		result.correction = previousSibling.lastChild
			.toString(new Set(['comment', 'ext', 'include', 'noinclude', 'arg', 'template', 'magic-word']))
			.includes('\n');
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}
		return result;
	}

	/** @private */
	override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, 'string');
		}
	}

	/** @override */
	override toString(omit?: Set<string>): string {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return omit && this.matchesTypes(omit)
			? ''
			: `${syntax.toString(omit)}${attr.toString(omit)}${this.#innerSyntax}${inner.toString(omit)}`;
	}

	/** @override */
	override text(): string {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/** @private */
	protected override getGaps(i: number): number {
		if (i === 1) {
			this.#correct();
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

/**
 * 创建新的单元格
 * @param inner 内部wikitext
 * @param subtype 单元格类型
 * @param attr 单元格属性
 * @param include 是否嵌入
 * @param config
 */
export const createTd = (
	inner?: string | Token,
	subtype: TdSubtypes = 'td',
	attr: TdAttrs = {},
	include = false,
	config = Parser.getConfig(),
): TdToken => {
	const innerToken = typeof inner === 'string' ? Parser.parse(inner, include, undefined, config) : inner!,
		token = Parser.run(() => new TdToken('\n|', undefined, config));
	token.setSyntax(subtype);
	token.lastChild.safeReplaceWith(innerToken);
	for (const [k, v] of Object.entries(attr)) {
		token.setAttr(k, v as string | true);
	}
	return token;
};

Parser.classes['TdToken'] = __filename;
