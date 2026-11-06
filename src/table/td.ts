import {
	BuildMethod,
} from '../../util/constants';
import {cached} from '../../mixin/cached';
import Parser from '../../index';
import {Token} from '../index';
import {
	TableBaseToken,

	/* NOT FOR BROWSER */

	escapeTable,
} from './base';
import type {
	Config,
} from '../../base';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {trimLc, newline} from '../../util/string';

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
declare type TdAttrGetter<T extends string> = T extends keyof TdSpanAttrs ? number : string | undefined;

/* NOT FOR BROWSER */

declare type TdAttrSetter<T extends string> = T extends keyof TdSpanAttrs ? number : string | boolean;
export type TdAttrs = Record<string, string> & TdSpanAttrs;

/* NOT FOR BROWSER END */

/**
 * `<td>`, `<th>` or `<caption>`
 *
 * `<td>`、`<th>`或`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
export abstract class TdToken extends TableBaseToken {
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): TrToken | SyntaxToken | this | undefined;
	abstract override get previousSibling(): Token | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'td' {
		return 'td';
	}

	/** cell type / 单元格类型 */
	get subtype(): TdSubtypes {
		return this.#getSyntax().subtype;
	}

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
		const [syntax, attr, inner] = this.childNodes;
		return syntax.toString(skip) + attr.toString(skip) + this.#innerSyntax + inner.toString(skip);
	}

	/** @private */
	override text(): string {
		const [syntax, attr, inner] = this.childNodes;
		return syntax.text() + attr.text() + this.#innerSyntax + inner.text();
	}

	/** @private */
	override getGaps(i: number): number {
		// eslint-disable-next-line unicorn/prefer-ternary
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
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
		/* NOT FOR BROWSER */

		key = trimLc(key) as T;

		/* NOT FOR BROWSER END */

		const value = super.getAttr(key);
		return (
			key === 'rowspan' || key === 'colspan' ? parseInt(value || '') || 1 : value
		) as TdAttrGetter<T>;
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
	setSyntax(subtype: TdSubtypes, esc?: boolean): void {
		const aliases: Record<TdSubtypes, string> = {td: '\n|', th: '\n!', caption: '\n|+'},
			{firstChild} = this;
		firstChild.replaceChildren(aliases[subtype]);
		if (esc) {
			escapeTable(firstChild);
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

	/**
	 * @override
	 * @param key attribute name / 属性键
	 * @param value attribute value / 属性值
	 */
	override setAttr<T extends string>(key: T, value: TdAttrSetter<T>): void {
		key = trimLc(key) as T;
		super.setAttr(key, (value !== 1 || key !== 'rowspan' && key !== 'colspan') && String(value));
		if (!this.childNodes[1].toString()) {
			this.#innerSyntax = '';
		}
	}

	/** @ignore */
	#toHtmlOrPlain(opt?: Omit<HtmlOpt, 'nocc'>): [string, string, string] {
		const {lastChild, nextSibling} = this,
			notEOL = nextSibling?.toString().startsWith('\n') === false,
			lf = opt?.nowrap ? ' ' : '\n';
		let html = lastChild.toHtmlInternal(opt).replace(/^[^\S\n]*/u, '');
		if (notEOL) {
			html = html.replace(/(?<=[\S\n])[^\S\n]*$/u, '');
		}
		return [lf, html, notEOL ? '' : lf];
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {subtype, childNodes: [, attr]} = this,
			[lf, html, lfAfter] = this.#toHtmlOrPlain(opt);
		return `${lf}<${subtype}${attr.toHtmlInternal({render: opt?.render})}>${
			subtype === 'caption' ? newline(html) : html
		}${lfAfter}</${subtype}>`;
	}
}
