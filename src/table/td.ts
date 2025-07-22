import {generateForChild} from '../../util/lint';
import {
	BuildMethod,
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
 * `<td>`, `<th>` or `<caption>`
 *
 * `<td>`、`<th>`或`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
export abstract class TdToken extends TableBaseToken {
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	abstract override get previousSibling(): Token | undefined;

	override get type(): 'td' {
		return 'td';
	}

	/** rowspan */
	get rowspan(): number {
		return this.getAttr('rowspan');
	}

	/** colspan */
	get colspan(): number {
		return this.getAttr('colspan');
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
		const result = {...(previousSibling as TdToken).#getSyntax()};
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
		const {childNodes: [syntax, attr, inner]} = this;
		return syntax.toString(skip) + attr.toString(skip) + this.#innerSyntax + inner.toString(skip);
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
			rect = new BoundingRect(this, start + this.getRelativeIndex(this.length - 1)),
			rule = 'pipe-like',
			severities = ['td', 'double'].map(key => Parser.lintConfig.getSeverity(rule, key));
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text') {
				const {data} = child;
				if (data.includes('|')) {
					const double = data.includes('||'),
						s = severities[double ? 1 : 0];
					if (s) {
						const e = generateForChild(child, rect, rule, 'additional "|" in a table cell', s);
						if (double) {
							const syntax = {caption: '|+', td: '|', th: '!'}[this.subtype];
							e.fix = {
								desc: 'newline',
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
		}
		return errors;
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
		const value = super.getAttr(key);
		return (key === 'rowspan' || key === 'colspan' ? parseInt(value as string) || 1 : value) as TdAttrGetter<T>;
	}

	/** @private */
	override print(): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start),
			{rowspan, colspan} = this;
		Object.assign(json, {subtype: this.subtype}, rowspan !== 1 && {rowspan}, colspan !== 1 && {colspan});
		return json;
	}
}
