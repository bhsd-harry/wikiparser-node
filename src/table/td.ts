import {generateForChild, fixBy, fixByPipe} from '../../util/lint';
import {
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {BoundingRect} from '../../lib/rect';
import {cached} from '../../mixin/cached';
import Parser from '../../index';
import {Token} from '../index';
import {TableBaseToken} from './base';
import type {
	Config,
	LintError,
	AST,
} from '../../base';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {trimLc, newline} from '../../util/string';
import {fixedToken} from '../../mixin/fixed';

/* NOT FOR BROWSER END */

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
 * `<td>`, `<th>` or `<caption>`
 *
 * `<td>`、`<th>`或`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
@fixedToken
export abstract class TdToken extends TableBaseToken {
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): TrToken | SyntaxToken | this | undefined;
	abstract override get previousSibling(): Token | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, Token];
	abstract override get parentElement(): TrToken | TableToken | undefined;
	abstract override get nextElementSibling(): TrToken | SyntaxToken | this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'td' {
		return 'td';
	}

	/** rowspan */
	get rowspan(): number {
		LINT: return this.getAttr('rowspan');
	}

	/** colspan */
	get colspan(): number {
		LINT: return this.getAttr('colspan');
	}

	/** cell type / 单元格类型 */
	get subtype(): TdSubtypes {
		return this.#getSyntax().subtype;
	}

	/* NOT FOR BROWSER */

	set subtype(subtype) {
		this.setSyntax(subtype);
	}

	set rowspan(rowspan) {
		this.setAttr('rowspan', rowspan);
	}

	set colspan(colspan) {
		this.setAttr('colspan', colspan);
	}

	/** inner wikitext / 内部wikitext */
	get innerText(): string {
		return this.lastChild.text().trim();
	}

	set innerText(text) {
		const {childNodes} = Parser.parseWithRef(text, this, undefined, true);
		this.lastChild.safeReplaceChildren(childNodes);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner?: string, config?: Config, accum: Token[] = []) {
		let innerSyntax = /\||\0\d+!\x7F/u.exec(inner ?? ''),
			attr = innerSyntax ? inner!.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(
			/^(?:\n[^\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u,
			syntax,
			'td',
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
	@cached(false)
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
		const result = {...(previousSibling as TdToken).#getSyntax()};

		/* NOT FOR BROWSER */

		const str = previousSibling.lastChild.toString();
		result.escape ||= esc;
		result.correction = str.includes('\n') && Shadow.run(() => {
			const token = new Token(str, this.getAttribute('config'))
				.parseOnce(0, this.getAttribute('include')).parseOnce().parseOnce();
			return token.firstChild!.toString().includes('\n');
		}, Parser);
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}

		/* NOT FOR BROWSER END */

		return result;
	}

	/** @private */
	override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, BuildMethod.String);
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

		const {childNodes: [syntax, attr, inner]} = this;
		return syntax.toString(skip) + attr.toString(skip) + this.#innerSyntax + inner.toString(skip);
	}

	/** @private */
	override text(): string {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

		const {childNodes: [syntax, attr, inner]} = this;
		return syntax.text() + attr.text() + this.#innerSyntax + inner.text();
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

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				rect = new BoundingRect(this, start + this.getRelativeIndex(this.length - 1)),
				rule = 'pipe-like',
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				severities = ['td', 'double'].map(key => lintConfig.getSeverity(rule, key));
			for (const child of this.lastChild.childNodes) {
				if (child.type === 'text') {
					const {data} = child;
					if (data.includes('|')) {
						const double = data.includes('||'),
							s = severities[double ? 1 : 0];
						if (s) {
							const e = generateForChild(child, rect, rule, 'pipe-in-table', s);
							if (computeEditInfo || fix) {
								if (double) {
									const syntax = {caption: '|+', td: '|', th: '!'}[this.subtype];
									e.fix = fixBy(
										e,
										'newline',
										data.replace(/\|\|/gu, `\n${syntax}`),
									);
								} else if (computeEditInfo) {
									e.suggestions = [fixByPipe(e.startIndex, data)];
								}
							}
							errors.push(e);
						}
					}
				}
			}
			return errors;
		}
	}

	/**
	 * Check if the cell is at the beginning of a line
	 *
	 * 是否位于行首
	 */
	isIndependent(): boolean {
		return this.firstChild.text().startsWith('\n');
	}

	override getAttr<T extends string>(key: T): TdAttrGetter<T> {
		LINT: {
			/* NOT FOR BROWSER */

			key = trimLc(key) as T;

			/* NOT FOR BROWSER END */

			const value = super.getAttr(key);
			return (
				key === 'rowspan' || key === 'colspan' ? parseInt(value as string) || 1 : value
			) as TdAttrGetter<T>;
		}
	}

	/** @private */
	override escape(): void {
		LSP: {
			super.escape();
			if (this.childNodes[1].toString()) {
				this.#innerSyntax ||= '{{!}}';
			}
			if (this.#innerSyntax === '|') {
				this.#innerSyntax = '{{!}}';
			}
		}
	}

	/** @private */
	override print(): string {
		PRINT: {
			const {childNodes: [syntax, attr, inner]} = this;
			return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
		}
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start),
				{rowspan, colspan} = this;
			Object.assign(json, {subtype: this.subtype}, rowspan !== 1 && {rowspan}, colspan !== 1 && {colspan});
			return json;
		}
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
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
		if (this.childNodes[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.#getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	/**
	 * Move to a new line
	 *
	 * 改为独占一行
	 */
	independence(): void {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.#getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

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
	 * @param key attribute name / 属性键
	 * @param value attribute value / 属性值
	 * @param prop attribute object / 属性对象
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
		const key = trimLc(keyOrProp) as T;
		let v: string | boolean;
		if (typeof value === 'number' && (key === 'rowspan' || key === 'colspan')) {
			v = value === 1 ? false : String(value);
		} else {
			v = String(value);
		}
		super.setAttr(key, v);
		if (!this.childNodes[1].toString()) {
			this.#innerSyntax = '';
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {subtype, childNodes: [, attr, inner], nextSibling} = this,
			notEOL = nextSibling?.toString().startsWith('\n') === false,
			lf = opt?.nowrap ? ' ' : '\n';
		let html = inner.toHtmlInternal(opt).replace(/^[^\S\n]*/u, '');
		if (notEOL) {
			html = html.replace(/(?<=[\S\n])[^\S\n]*$/u, '');
		}
		return `${lf}<${subtype}${attr.toHtmlInternal()}>${
			subtype === 'caption' ? newline(html) : html + (notEOL ? '' : lf)
		}</${subtype}>`;
	}
}

/* NOT FOR BROWSER */

/**
 * 创建新的单元格
 * @param inner 内部wikitext
 * @param ref 参考节点
 * @param subtype 单元格类型
 * @param attr 单元格属性
 */
export const createTd = (
	inner: string | Token,
	ref: Token,
	subtype: TdSubtypes = 'td',
	attr: TdAttrs = {},
): TdToken => {
	const innerToken = typeof inner === 'string' ? Parser.parseWithRef(inner, ref) : inner,
		// @ts-expect-error abstract class
		token = Shadow.run((): TdToken => new TdToken('\n|', undefined, ref.getAttribute('config')));
	token.setSyntax(subtype);
	token.lastChild.safeReplaceWith(innerToken);
	token.setAttr(attr);
	return token;
};

classes['TdToken'] = __filename;
