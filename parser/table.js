'use strict';

const Parser = require('..'),
	AstText = require('../lib/text'),
	Token = require('../src'),
	TableToken = require('../src/table'),
	TrToken = require('../src/table/tr'),
	TdToken = require('../src/table/td'),
	DdToken = require('../src/nowiki/dd');

/**
 * 解析表格，注意`tr`和`td`包含开头的换行
 * @param {Token & {firstChild: AstText}} root 根节点
 * @param {accum} accum
 */
const parseTable = ({firstChild: {data}, type, name}, config = Parser.getConfig(), accum = []) => {
	const /** @type {TrToken[]} */ stack = [],
		lines = data.split('\n');
	let out = type === 'root' || type === 'ext-inner' && name === 'poem' ? '' : `\n${lines.shift()}`;

	/**
	 * 向表格中插入纯文本
	 * @param {string} str 待插入的文本
	 * @param {TrToken} top 当前解析的表格或表格行
	 */
	const push = (str, top) => {
		if (!top) {
			out += str;
			return;
		}
		const {lastChild} = top;
		if (lastChild.isPlain()) {
			lastChild.setText(String(lastChild) + str);
		} else {
			const token = new Token(str, config, true, accum);
			token.type = 'table-inter';
			top.appendChild(token.setAttribute('stage', 3));
		}
	};
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = /^(?:\s|\0\d+c\x7F)*/u.exec(outLine),
			line = outLine.slice(spaces.length),
			matchesStart = /^(:*)((?:\s|\0\d+c\x7F)*)(\{\||\{\0\d+!\x7F|\0\d+\{\x7F)(.*)$/u.exec(line);
		if (matchesStart) {
			while (top && top.type !== 'td') {
				top = stack.pop();
			}
			const [, indent, moreSpaces, tableSyntax, attr] = matchesStart;
			if (indent) {
				new DdToken(indent, config, accum);
			}
			push(`\n${spaces}${indent && `\0${accum.length - 1}d\x7F`}${moreSpaces}\0${accum.length}b\x7F`, top);
			const table = new TableToken(tableSyntax, attr, config, accum);
			stack.push(...top ? [top] : [], table);
			continue;
		} else if (!top) {
			out += `\n${outLine}`;
			continue;
		}
		const matches = // eslint-disable-line operator-linebreak
			/^(?:(\|\}|\0\d+!\x7F\}|\0\d+\}\x7F)|(\|-+|\0\d+!\x7F-+|\0\d+-\x7F-*)(?!-)|(!|(?:\||\0\d+!\x7F)\+?))(.*)$/u
				.exec(line);
		if (!matches) {
			push(`\n${outLine}`, top);
			stack.push(...top ? [top] : []);
			continue;
		}
		const [, closing, row, cell, attr] = matches;
		if (closing) {
			while (!(top instanceof TableToken)) {
				top = stack.pop();
			}
			top.close(`\n${spaces}${closing}`, true);
			push(attr, stack.at(-1));
		} else if (row) {
			if (top.type === 'td') {
				top = stack.pop();
			}
			if (top.type === 'tr') {
				top = stack.pop();
			}
			const tr = new TrToken(`\n${spaces}${row}`, attr, config, accum);
			stack.push(top, tr);
			top.appendChild(tr);
		} else {
			if (top.type === 'td') {
				top = stack.pop();
			}
			const regex = cell === '!'
				? /!!|(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu
				: /(?:\||\0\d+!\x7F){2}|\0\d+\+\x7F/gu;
			let mt = regex.exec(attr),
				lastIndex = 0,
				lastSyntax = `\n${spaces}${cell}`;
			while (mt) {
				const td = new TdToken(lastSyntax, attr.slice(lastIndex, mt.index), config, accum);
				top.appendChild(td);
				({lastIndex} = regex);
				[lastSyntax] = mt;
				mt = regex.exec(attr);
			}
			const td = new TdToken(lastSyntax, attr.slice(lastIndex), config, accum);
			stack.push(top, td);
			top.appendChild(td);
		}
	}
	return out.slice(1);
};

module.exports = parseTable;
