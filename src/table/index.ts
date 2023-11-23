import {generateForChild} from '../../util/lint';
import * as Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {LintError} from '../../index';
import type {AttributesToken} from '../../internal';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
// @ts-expect-error not implementing all abstract methods
export class TableToken extends TrBaseToken {
	override readonly type = 'table';

	declare childNodes: [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
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
			const {firstChild, lastChild: tr} = this,
				{lastChild: td} = tr,
				error = generateForChild(firstChild, {start}, 'unclosed table');
			errors.push({...error, excerpt: String(td?.type === 'td' ? td : tr).slice(0, 50)});
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @param halfParsed
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			{lastChild} = this;
		if (inner && !closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法：${noWrap(syntax)}`);
		} else if (lastChild instanceof SyntaxToken) {
			lastChild.replaceChildren(...(inner as Token).childNodes);
		} else {
			super.insertAt(Parser.run(() => {
				const token = new SyntaxToken(syntax, closingPattern, 'table-syntax', config, accum, {
				});
				return token;
			}));
		}
	}
}
