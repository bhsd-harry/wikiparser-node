import {generateForChild} from '../../util/lint';
import Parser from '../../index';
import {Token} from '..';
import {TableBaseToken} from './base';
import type {LintError} from '../../index';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

declare interface TdSyntax {
	subtype: 'td' | 'th' | 'caption';
}
export type TdAttrs = Record<string, string | true> & {rowspan?: number, colspan?: number};

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
export abstract class TdToken extends TableBaseToken {
	/** @browser */
	override readonly type = 'td';
	declare childNodes: [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): this | TrToken | SyntaxToken | undefined;
	abstract override get previousSibling(): Token | undefined;

	/** @browser */
	#innerSyntax = '';

	/**
	 * 单元格类型
	 * @browser
	 */
	get subtype(): 'td' | 'th' | 'caption' {
		return this.getSyntax().subtype;
	}

	/**
	 * @browser
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
		);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax as [string];
		}
		const innerToken = new Token(
			inner?.slice((innerSyntax?.index ?? NaN) + this.#innerSyntax.length),
			config,
			true,
			accum,
		);
		innerToken.type = 'td-inner';
		this.insertAt(innerToken.setAttribute('stage', 4));
	}

	/** @private */
	protected getSyntax(): TdSyntax {
		const syntax = this.firstChild.text(),
			char = syntax.at(-1)!;
		let subtype: 'td' | 'th' | 'caption' = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		return {subtype};
	}

	/** @private */
	protected override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, 'string');
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	/**
	 * @override
	 * @browser
	 */
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

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			newStart = start + this.getRelativeIndex(this.length - 1);
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text' && child.data.includes('|')) {
				errors.push(generateForChild(child, {start: newStart}, 'additional "|" in a table cell', 'warning'));
			}
		}
		return errors;
	}
}
