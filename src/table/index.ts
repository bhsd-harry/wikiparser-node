import {generateForChild} from '../../util/lint';
import {Shadow} from '../../util/debug';
import Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	LintError,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
export abstract class TableToken extends TrBaseToken {
	override readonly type = 'table';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
	| readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
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
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (!this.closed) {
			errors.push(
				generateForChild(this.firstChild, {start}, 'unclosed-table', Parser.msg('unclosed $1', 'table')),
			);
		}
		return errors;
	}

	/** @private */
	close(syntax = '\n|}', halfParsed = false): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = halfParsed ? [syntax] : Parser.parse(syntax, this.getAttribute('include'), 2, config).childNodes;
		const token = Shadow.run(() => super.insertAt(
			new SyntaxToken(undefined, closingPattern, 'table-syntax', config, accum, {
			}),
		));
		if (!halfParsed) {
			token.afterBuild();
		}
		(this.lastChild as SyntaxToken).replaceChildren(...inner);
	}
}
