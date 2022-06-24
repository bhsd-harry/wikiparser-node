'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {{firstChild: string, type: string}}
 * @param {accum} accum
 */
const parseTable = ({firstChild, type}, config = Parser.getConfig(), accum = []) => {
	const TableToken = require('../src/table'),
		TrToken = require('../src/table/tr'),
		TdToken = require('../src/table/td'),
		/** @type {TrToken[]} */ stack = [];
	let out = '';
	const /** @type {(str: string, top: TableToken & {firstChild: string}) => void} */ push = (str, top) => {
		if (!top) {
			out += str;
		} else if (top instanceof TdToken) {
			const {lastElementChild} = top;
			lastElementChild.setText(lastElementChild.firstChild + str, 0);
		} else if (typeof top.lastChild === 'string') {
			top.setText(top.lastChild + str, 2);
		} else {
			top.appendChild(str);
		}
	};
	const lines = firstChild.split('\n');
	if (type !== 'root') {
		lines.shift();
	}
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = outLine.match(/^(?:\s|\x00\d+c\x7f)*/);
		const line = outLine.slice(spaces.length),
			matchesStart = line.match(
				/^((?:\x00\d+c\x7f|:)*(?:\s|\x00\d+c\x7f)*)({\||{\x00\d+!\x7f|\x00\d+{\x7f)(.*)$/,
			);
		if (matchesStart) {
			const [, indent, tableSyntax, attr] = matchesStart;
			push(`\n${spaces}${indent}\x00${accum.length}b\x7f`, top);
			const table = new TableToken(tableSyntax, attr, config, accum);
			stack.push(...top ? [top] : [], table);
			continue;
		} else if (!top) {
			out += `\n${outLine}`;
			continue;
		}
		const matches = line.match(
			/^(?:(\|}|\x00\d+!\x7f}|\x00\d+}\x7f)|((?:\|-|\x00\d+!\x7f-|\x00\d+-\x7f)-*)|(!|(?:\||\x00\d+!\x7f)\+?))(.*)$/,
		);
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
			top.close(`\n${spaces}${closing}`);
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
		} else if (cell) {
			if (top.type === 'td') {
				top = stack.at(-1);
			} else {
				stack.push(top);
			}
			const regex = cell === '!'
				? /!!|(?:\||\x00\d+!\x7f){2}|\x00\d+\+\x7f/g
				: /(?:\||\x00\d+!\x7f){2}|\x00\d+\+\x7f/g;
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
			top.appendChild(td);
			stack.push(td);
		} else {
			push(`\n${outLine}`, top);
		}
	}
	return out.slice(1);
};

Parser.parsers.parseTable = __filename;
module.exports = parseTable;
