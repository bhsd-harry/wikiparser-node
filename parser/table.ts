import {parsers} from '../util/constants';
import Parser from '../index';
import {Token} from '../src/index';
import {TableToken} from '../src/table/index';
import {TrToken} from '../src/table/tr';
import {TdToken} from '../src/table/td';
import {DdToken} from '../src/nowiki/dd';
import type {AstText} from '../internal';

/**
 * 判断是否为表格行或表格
 * @param token 表格节点
 */
const isTr = (token: TrToken | TableToken | TdToken): token is TrToken | TableToken =>
	token.lastChild.constructor !== Token;

/**
 * 解析表格，注意`tr`和`td`包含开头的换行
 * @param {Token & {firstChild: AstText}} root 根节点
 * @param config
 * @param accum
 */
export const parseTable = (
	{firstChild: {data}, type, name}: Token & {firstChild: AstText},
	config = Parser.getConfig(),
	accum: Token[] = [],
): string => {
	const stack: (TrToken | TableToken | TdToken)[] = [],
		lines = data.split('\n');
	let out = type === 'root' || type === 'parameter-value' || type === 'ext-inner' && name === 'poem'
			? ''
			: `\n${lines.shift()!}`,
		top: TrToken | TableToken | TdToken | undefined;

	/**
	 * 向表格中插入纯文本
	 * @param str 待插入的文本
	 * @param topToken 当前解析的表格或表格行
	 */
	const push = (str: string, topToken?: TrToken | TableToken | TdToken): void => {
			if (!topToken) {
				out += str;
				return;
			}
			const {lastChild} = topToken;
			if (isTr(topToken)) {
				const token = new Token(str, config, accum);
				token.type = 'table-inter';
				token.setAttribute('stage', 3);
				topToken.insertAt(token);
			} else {
				lastChild.setText(String(lastChild) + str);
			}
		},

		/** 取出最近的表格行 */
		pop = (): TrToken | TableToken => top!.type === 'td' ? stack.pop() as TrToken | TableToken : top!;
	for (const outLine of lines) {
		top = stack.pop();
		const [spaces] = /^(?:\s|\0\d+c\x7F)*/u.exec(outLine)!,
			line = outLine.slice(spaces.length),
			matchesStart = /^(:*)((?:\s|\0\d+c\x7F)*)(\{\||\{(?:\0\d+c\x7F)*\0\d+!\x7F|\0\d+\{\x7F)(.*)$/u
				.exec(line) as [string, string, string, string, string] | null;
		if (matchesStart) {
			while (top && top.type !== 'td') {
				top = stack.pop();
			}
			const [, indent, moreSpaces, tableSyntax, attr] = matchesStart;
			if (indent) {
				// @ts-expect-error abstract class
				new DdToken(indent, config, accum);
			}
			push(`\n${spaces}${indent && `\0${accum.length - 1}d\x7F`}${moreSpaces}\0${accum.length}b\x7F`, top);
			// @ts-expect-error abstract class
			stack.push(...top ? [top] : [], new TableToken(tableSyntax, attr, config, accum) as TableToken);
			continue;
		} else if (!top) {
			out += `\n${outLine}`;
			continue;
		}
		// eslint-disable-next-line @stylistic/operator-linebreak
		const matches =
			/^(?:(\|\}|\0\d+!\x7F\}|\0\d+\}\x7F)|(\|-+|\0\d+!\x7F-+|\0\d+-\x7F-*)(?!-)|(!|(?:\||\0\d+!\x7F)\+?))(.*)$/u
				.exec(line) as [string, string | undefined, string | undefined, string | undefined, string] | null;
		if (!matches) {
			push(`\n${outLine}`, top);
			stack.push(top);
			continue;
		}
		const [, closing, row, cell, attr] = matches;
		if (closing) {
			while (top!.type !== 'table') {
				top = stack.pop();
			}
			top!.close(`\n${spaces}${closing}`, true);
			push(attr, stack[stack.length - 1]);
		} else if (row) {
			top = pop();
			if (top.type === 'tr') {
				top = stack.pop() as TableToken;
			}
			// @ts-expect-error abstract class
			const tr: TrToken = new TrToken(`\n${spaces}${row}`, attr, config, accum);
			stack.push(top, tr);
			top.insertAt(tr);
		} else {
			top = pop();
			const regex = cell === '!' ? /!!|(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu : /(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu;
			let mt = regex.exec(attr),
				lastIndex = 0,
				lastSyntax = `\n${spaces}${cell!}`;

			/**
			 * 创建表格单元格
			 * @param tr 当前表格行
			 */
			const createTd = (tr: TrToken | TableToken): TdToken => {
				// @ts-expect-error abstract class
				const td: TdToken = new TdToken(lastSyntax, attr.slice(lastIndex, mt?.index), config, accum);
				tr.insertAt(td);
				return td;
			};
			while (mt) {
				createTd(top);
				({lastIndex} = regex);
				[lastSyntax] = mt;
				mt = regex.exec(attr);
			}
			stack.push(top, createTd(top));
		}
	}
	return out.slice(1);
};
parsers['parseTable'] = __filename;
