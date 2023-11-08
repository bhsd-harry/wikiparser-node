import * as Parser from '../index';
import Token = require('../src');
import TableToken = require('../src/table');
import TrToken = require('../src/table/tr');
import TdToken = require('../src/table/td');
import DdToken = require('../src/nowiki/dd');
import AstText = require('../lib/text');
import TrBaseToken = require('../src/table/trBase');

/**
 * 解析表格，注意`tr`和`td`包含开头的换行
 * @param {Token & {firstChild: AstText}} root 根节点
 */
const parseTable = (
	{firstChild: {data}, type, name}: Token & {firstChild: AstText},
	config = Parser.getConfig(),
	accum: Token[] = [],
): string => {
	const stack: (TrToken | TableToken | TdToken)[] = [],
		lines = data.split('\n');
	let out = type === 'root' || type === 'parameter-value' || type === 'ext-inner' && name === 'poem'
		? ''
		: `\n${lines.shift()!}`;

	/**
	 * 向表格中插入纯文本
	 * @param str 待插入的文本
	 * @param top 当前解析的表格或表格行
	 */
	const push = (str: string, top?: TrToken | TableToken | TdToken): void => {
		if (!top) {
			out += str;
			return;
		}
		const {lastChild} = top;
		if (lastChild.constructor === Token) {
			lastChild.setText(String(lastChild) + str);
		} else {
			const token = new Token(str, config, true, accum);
			token.type = 'table-inter';
			(top as TrBaseToken).insertAt(token.setAttribute('stage', 3));
		}
	};
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = /^(?:\s|\0\d+c\x7F)*/u.exec(outLine) as string[] as [string],
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
			const table: TableToken = new TableToken(tableSyntax, attr, config, accum);
			stack.push(...top ? [top] : [], table);
			continue;
		} else if (!top) {
			out += `\n${outLine}`;
			continue;
		}
		// eslint-disable-next-line operator-linebreak
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
			(top as TableToken).close(`\n${spaces}${closing}`, true);
			push(attr, stack.at(-1));
		} else if (row) {
			if (top.type === 'td') {
				top = stack.pop();
			}
			if (top!.type === 'tr') {
				top = stack.pop();
			}
			// @ts-expect-error abstract class
			const tr: TrToken = new TrToken(`\n${spaces}${row}`, attr, config, accum);
			stack.push(top!, tr);
			(top as TableToken).insertAt(tr);
		} else {
			if (top.type === 'td') {
				top = stack.pop();
			}
			const regex = cell === '!'
				? /!!|(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu
				: /(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu;
			let mt = regex.exec(attr),
				lastIndex = 0,
				lastSyntax = `\n${spaces}${cell!}`;
			while (mt) {
				// @ts-expect-error abstract class
				const td: TdToken = new TdToken(lastSyntax, attr.slice(lastIndex, mt.index), config, accum);
				(top as TrBaseToken).insertAt(td);
				({lastIndex} = regex);
				[lastSyntax] = mt as string[] as [string];
				mt = regex.exec(attr);
			}
			// @ts-expect-error abstract class
			const td: TdToken = new TdToken(lastSyntax, attr.slice(lastIndex), config, accum);
			stack.push(top!, td);
			(top as TrBaseToken).insertAt(td);
		}
	}
	return out.slice(1);
};

Parser.parsers['parseTable'] = __filename;
export = parseTable;
