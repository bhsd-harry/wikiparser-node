import {generateForChild} from '../../util/lint';
import {Shadow} from '../../util/debug';
import * as Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {LintError} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
// @ts-expect-error not implementing all abstract methods
export class TableToken extends TrBaseToken {
	override readonly type = 'table';

	declare readonly childNodes: [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
	| [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	// @ts-expect-error abstract method
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/** 表格是否闭合 */
	get closed(): boolean {
		return this.lastChild.type === 'table-syntax';
	}

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, attr, config, accum, {
		});
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (!this.closed) {
			errors.push(generateForChild(this.firstChild, {start}, Parser.msg('unclosed $1', 'table')));
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @param halfParsed
	 */
	close(syntax = '\n|}', halfParsed = false): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = halfParsed ? [syntax] : Parser.parse(syntax, this.getAttribute('include'), 2, config).childNodes;
		const token = Shadow.run(() => super.insertAt(
			new SyntaxToken(undefined, closingPattern, 'table-syntax', config, accum, {
			}),
		));
		(this.lastChild as SyntaxToken).replaceChildren(...inner);
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			closed: this.closed,
		};
	}
}
