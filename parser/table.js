'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * `tr`和`td`包含开头的换行
 * @param {{firstChild: string, type: string}}
 * @param {accum} accum
 */
const parseTable = ({firstChild, type}, config = Parser.getConfig(), accum = []) => {
	const Token = require('../src'),
		TableToken = require('../src/table'),
		TrToken = require('../src/table/tr'),
		TdToken = require('../src/table/td'),
		DdToken = require('../src/nowiki/dd'),
		/** @type {TrToken[]} */ stack = [],
		lines = firstChild.split('\n');
	let out = type === 'root' ? '' : `\n${lines.shift()}`;
	const /** @type {(str: string, top: TrToken & {firstChild: string}) => void} */ push = (str, top) => {
		if (!top) {
			out += str;
			return;
		}
		const {lastElementChild} = top;
		if (lastElementChild.isPlain()) {
			lastElementChild.setText(lastElementChild.firstChild + str, 0);
		} else {
			const token = new Token(str, config, true, accum);
			token.type = 'table-inter';
			top.appendChild(token.setAttribute('stage', 3));
		}
	};
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = /^(?:\s|\0\d+c\x7f)*/.exec(outLine);
		const line = outLine.slice(spaces.length),
			matchesStart = /^(:*)((?:\s|\0\d+c\x7f)*)(\{\||\{\0\d+!\x7f|\0\d+\{\x7f)(.*)$/.exec(line);
		if (matchesStart) {
			while (top && top.type !== 'td') {
				top = stack.pop();
			}
			const [, indent, moreSpaces, tableSyntax, attr] = matchesStart;
			if (indent) {
				new DdToken(indent, config, accum);
			}
			push(`\n${spaces}${indent && `\0${accum.length - 1}d\x7f`}${moreSpaces}\0${accum.length}b\x7f`, top);
			const table = new TableToken(tableSyntax, attr, config, accum);
			stack.push(...top ? [top] : [], table);
			continue;
		} else if (!top) {
			out += `\n${outLine}`;
			continue;
		}
		const matches
			= /^(?:(\|\}|\0\d+!\x7f\}|\0\d+\}\x7f)|(\|-+|\0\d+!\x7f-+|\0\d+-\x7f-*)(?!-)|(!|(?:\||\0\d+!\x7f)\+?))(.*)$/
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
				? /!!|(?:\||\0\d+!\x7f){2}|\0\d+\+\x7f/g
				: /(?:\||\0\d+!\x7f){2}|\0\d+\+\x7f/g;
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

Parser.parsers.parseTable = __filename;
module.exports = parseTable;
