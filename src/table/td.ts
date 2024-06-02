import {generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {
	BuildMethod,
} from '../../util/constants';
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
}
export interface TdSpanAttrs {
	rowspan?: number;
	colspan?: number;
}
declare type TdAttrGetter<T extends string> = T extends keyof TdSpanAttrs ? number : string | true | undefined;

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
export abstract class TdToken extends TableBaseToken {
	override readonly type = 'td';
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	abstract override get previousSibling(): Token | undefined;

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
			};
		}
		const {previousSibling} = this;
		const result = (previousSibling as TdToken).#getSyntax();
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
		const {childNodes: [syntax, attr, inner]} = this;
		return syntax.toString() + attr.toString() + this.#innerSyntax + inner.toString();
	}

	/** @private */
	override text(): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return syntax.text() + attr.text() + this.#innerSyntax + inner.text();
	}

	/** @private */
	override getGaps(i: number): number {
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start + this.getRelativeIndex(this.length - 1));
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text') {
				const {data} = child;
				if (data.includes('|')) {
					const isError = data.includes('||'),
						e = generateForChild(
							child,
							rect,
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
		return (key === 'rowspan' || key === 'colspan' ? parseInt(value as string) || 1 : value) as TdAttrGetter<T>;
	}

	/** @private */
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
}
