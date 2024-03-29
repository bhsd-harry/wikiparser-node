import {generateForChild} from '../../util/lint';
import {
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {Shadow} from '../../util/debug';
import {fixedToken} from '../../mixin/fixed';
import Parser from '../../index';
import {Token} from '../index';
import {TableBaseToken} from './base';
import type {
	LintError,
	AST,
} from '../../base';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

export type TdSubtypes = 'td' | 'th' | 'caption';
declare interface TdSyntax {
	subtype: TdSubtypes;

	/* NOT FOR BROWSER */

	escape: boolean;
	correction: boolean;
}
export interface TdSpanAttrs {
	rowspan?: number;
	colspan?: number;
}
declare type TdAttrGetter<T extends string> = T extends keyof TdSpanAttrs ? number : string | true | undefined;

/* NOT FOR BROWSER */

declare type TdAttrSetter<T extends string> = T extends keyof TdSpanAttrs ? number : string | boolean;
export type TdAttrs = Record<string, string | true> & TdSpanAttrs;

/* NOT FOR BROWSER END */

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
@fixedToken
export abstract class TdToken extends TableBaseToken {
	override readonly type = 'td';
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	abstract override get previousSibling(): Token | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, Token];
	abstract override get parentElement(): TrToken | TableToken | undefined;
	abstract override get nextElementSibling(): this | TrToken | SyntaxToken | undefined;

	/* NOT FOR BROWSER END */

	/** rowspan */
	get rowspan(): number {
		return this.getAttr('rowspan');
	}

	/** colspan */
	get colspan(): number {
		return this.getAttr('colspan');
	}

	/** 单元格类型 */
	get subtype(): TdSubtypes {
		return this.#getSyntax().subtype;
	}

	/* NOT FOR BROWSER */

	set subtype(subtype) {
		this.setSyntax(subtype);
	}

	set rowspan(rowspan) { // eslint-disable-line grouped-accessor-pairs, jsdoc/require-jsdoc
		this.setAttr('rowspan', rowspan);
	}

	set colspan(colspan) { // eslint-disable-line grouped-accessor-pairs, jsdoc/require-jsdoc
		this.setAttr('colspan', colspan);
	}

	/** 内部wikitext */
	get innerText(): string {
		return this.lastChild.text().trim();
	}

	set innerText(text) {
		this.lastChild.replaceChildren(...Parser.parse(text, true, undefined, this.getAttribute('config')).childNodes);
	}

	/* NOT FOR BROWSER END */

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
			{SyntaxToken: 0, AttributesToken: 1, Token: 2},
		);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
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

			/* NOT FOR BROWSER */

			esc = syntax.includes('{{'),

			/* NOT FOR BROWSER END */

			char = syntax.slice(-1);
		let subtype: TdSubtypes = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {
				subtype,

				/* NOT FOR BROWSER */

				escape: esc,
				correction: false,
			};
		}
		const {previousSibling} = this;

		/* NOT FOR BROWSER */

		if (!(previousSibling instanceof TdToken)) {
			return {subtype, escape: esc, correction: true};
		}

		/* NOT FOR BROWSER END */

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const result = (previousSibling as TdToken).#getSyntax();

		/* NOT FOR BROWSER */

		const str = String(previousSibling.lastChild);
		result.escape ||= esc;
		result.correction = str.includes('\n') && Shadow.run(() => {
			const config = this.getAttribute('config'),
				include = this.getAttribute('include');
			return String(new Token(str, config).parseOnce(0, include).parseOnce().parseOnce()).includes('\n');
		});
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}

		return result;
	}

	/** @private */
	override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, BuildMethod.String);
		}
	}

	/** @private */
	override toString(): string {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

		const {childNodes: [syntax, attr, inner]} = this;
		return `${String(syntax)}${String(attr)}${this.#innerSyntax}${String(inner)}`;
	}

	/** @override */
	override text(): string {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/** @private */
	override getGaps(i: number): number {
		if (i === 1) {
			/* NOT FOR BROWSER */

			this.#correct();

			/* NOT FOR BROWSER END */

			return this.#innerSyntax.length;
		}
		return 0;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		start += this.getRelativeIndex(this.length - 1);
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text') {
				const {data} = child;
				if (data.includes('|')) {
					const isError = data.includes('||'),
						e = generateForChild(
							child,
							{start},
							'pipe-like',
							'additional "|" in a table cell',
							isError ? 'error' : 'warning',
						);
					if (isError) {
						const syntax = {caption: '|+', td: '|', th: '!'}[this.subtype];
						e.fix = {
							range: [e.startIndex, e.endIndex],
							text: data.replace(/\|\|/gu, `\n${syntax}`),
						};
					} else {
						e.suggestions = [
							{
								desc: 'escape',
								range: [e.startIndex, e.endIndex],
								text: data.replace(/\|/gu, '&#124;'),
							},
						];
					}
					errors.push(e);
				}
			}
		}
		return errors;
	}

	/** 是否位于行首 */
	isIndependent(): boolean {
		return this.firstChild.text().startsWith('\n');
	}

	/**
	 * @override
	 * @param key 属性键
	 */
	override getAttr<T extends string>(key: T): TdAttrGetter<T> {
		const value = super.getAttr(key);
		key = key.toLowerCase().trim() as T;
		return (key === 'rowspan' || key === 'colspan' ? parseInt(value as string) || 1 : value) as TdAttrGetter<T>;
	}

	/** @override */
	override print(): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}

	/** @override */
	override json(): AST {
		const json = super.json();
		json['subtype'] = this.subtype;
		return json;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'innerSyntax' ? this.#innerSyntax as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
		if (key === 'innerSyntax') {
			this.#innerSyntax = (value ?? '') as string;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	override setSyntax(syntax: string, esc?: boolean): void {
		const aliases: Record<string, string> = {td: '\n|', th: '\n!', caption: '\n|+'};
		super.setSyntax(aliases[syntax] ?? syntax, esc);
	}

	/** 修复\<td\>语法 */
	#correct(): void {
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.#getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	/** 改为独占一行 */
	independence(): void {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.#getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

	/** @override */
	override getAttrs(): TdAttrs {
		const attr: TdAttrs = super.getAttrs();
		if ('rowspan' in attr) {
			attr.rowspan = parseInt(attr.rowspan as unknown as string);
		}
		if ('colspan' in attr) {
			attr.colspan = parseInt(attr.colspan as unknown as string);
		}
		return attr;
	}

	/**
	 * @override
	 * @param key 属性键
	 * @param value 属性值
	 * @param prop 属性对象
	 */
	override setAttr<T extends string>(key: T, value: TdAttrSetter<T>): void;
	override setAttr(prop: Record<string, string | number | boolean>): void;
	override setAttr<T extends string>(
		keyOrProp: T | Record<string, string | number | boolean>,
		value?: TdAttrSetter<T>,
	): void {
		if (typeof keyOrProp !== 'string') {
			for (const [key, val] of Object.entries(keyOrProp)) {
				this.setAttr(key, val as string | boolean);
			}
			return;
		}
		const key = keyOrProp.toLowerCase().trim() as T;
		let v: string | boolean;
		if (typeof value === 'number' && (key === 'rowspan' || key === 'colspan')) {
			v = value === 1 ? false : String(value);
		} else {
			v = value!;
		}
		super.setAttr(key, v);
		if (!String(this.childNodes[1])) {
			this.#innerSyntax = '';
		}
	}

	/** @override */
	override escape(): void {
		super.escape();
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '{{!}}';
		}
		if (this.#innerSyntax === '|') {
			this.#innerSyntax = '{{!}}';
		}
	}
}

/* NOT FOR BROWSER */

/**
 * 创建新的单元格
 * @param inner 内部wikitext
 * @param subtype 单元格类型
 * @param attr 单元格属性
 * @param include 是否嵌入
 * @param config
 */
export const createTd = (
	inner: string | Token,
	subtype: TdSubtypes = 'td',
	attr: TdAttrs = {},
	include?: boolean,
	config = Parser.getConfig(),
): TdToken => {
	const innerToken = typeof inner === 'string' ? Parser.parse(inner, include, undefined, config) : inner,
		// @ts-expect-error abstract class
		token = Shadow.run(() => new TdToken('\n|', undefined, config) as TdToken);
	token.setSyntax(subtype);
	token.lastChild.safeReplaceWith(innerToken);
	token.setAttr(attr);
	return token;
};

/* NOT FOR BROWSER END */

classes['TdToken'] = __filename;
