import {Shadow} from '../util/debug';
import * as Parser from '../index';
import {Token} from '../src/index';
import {TableToken} from '../src/table/index';
import {TrToken} from '../src/table/tr';
import {TdToken} from '../src/table/td';
import {DdToken} from '../src/nowiki/dd';
import type {AstText} from '../internal';

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
			const token = new Token(str, config, accum);
			token.type = 'table-inter';
			token.setAttribute('stage', 3);
			(top as TrToken | TableToken).insertAt(token);
		}
	};
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = /^(?:\s|\0\d+c\x7F)*/u.exec(outLine) as [string],
			line = outLine.slice(spaces.length),
			matchesStart = /^(:*)((?:\s|\0\d+c\x7F)*)(\{\||\{(?:\0\d+c\x7F)*\0\d+!\x7F|\0\d+\{\x7F)(.*)$/u
				.exec(line) as [string, string, string, string, string] | null;
		if (matchesStart) {
			while (top && top.type !== 'td') {
				top = stack.pop();
			}
			const [, indent, moreSpaces, tableSyntax, attr] = matchesStart;
			if (indent) {
				new DdToken(indent, config, accum);
			}
			push(`\n${spaces}${indent && `\0${accum.length - 1}d\x7F`}${moreSpaces}\0${accum.length}b\x7F`, top);
			stack.push(...top ? [top] : [], new TableToken(tableSyntax, attr, config, accum));
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
			top!.close(`\n${spaces}${closing}`, true);
			push(attr, stack.at(-1));
		} else if (row) {
			if (top.type === 'td') {
				top = stack.pop() as TrToken | TableToken;
			}
			if (top.type === 'tr') {
				top = stack.pop() as TableToken;
			}
			const tr = new TrToken(`\n${spaces}${row}`, attr, config, accum);
			stack.push(top, tr);
			top.insertAt(tr);
		} else {
			if (top.type === 'td') {
				top = stack.pop() as TrToken | TableToken;
			}
			const regex = cell === '!' ? /!!|(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu : /(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu;
			let mt = regex.exec(attr),
				lastIndex = 0,
				lastSyntax = `\n${spaces}${cell!}`;
			while (mt) {
				top.insertAt(new TdToken(lastSyntax, attr.slice(lastIndex, mt.index), config, accum));
				({lastIndex} = regex);
				[lastSyntax] = mt as [string];
				mt = regex.exec(attr);
			}
			const td = new TdToken(lastSyntax, attr.slice(lastIndex), config, accum);
			stack.push(top, td);
			top.insertAt(td);
		}
	}
	return out.slice(1);
};
Shadow.parsers['parseTable'] = __filename;
