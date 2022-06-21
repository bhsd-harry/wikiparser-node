'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {{firstChild: string, type: string}}
 * @param {accum} accum
 */
const parseTable = ({firstChild, type}, config = Parser.getConfig(), accum = []) => {
	const TableToken = require('../src/tableToken'),
		TdToken = require('../src/tableToken/tdToken'),
		/** @type {TableToken[]} */ stack = [];
	let out = '';
	const /** @type {(str: string, top: TableToken) => void} */ push = (str, top) => {
		if (!top) {
			out += str;
		} else if (top instanceof TdToken) {
			const {lastElementChild} = top;
			lastElementChild.setText(lastElementChild.firstChild + str, 0);
		} else if (typeof top.lastChild === 'string') {
			top.setText(top.lastChild + str, 1);
		} else {
			top.appendChild(str.replace(/^\n/, ''));
		}
	};
	const lines = firstChild.split('\n');
	if (type !== 'root') {
		lines.shift();
	}
	for (const outLine of lines) {
		let top = stack.pop();
		const [spaces] = outLine.match(/^(?:\s|\x00\d+c\x7f)*/);
		push(`\n${spaces}`, top);
		const line = outLine.slice(spaces.length),
			matchesStart = line.match(
				/^((?:\x00\d+c\x7f|:)*(?:\s|\x00\d+c\x7f)*)({\||{\x00\d+!\x7f|\x00\d+{\x7f)(.*)$/,
			);
		if (matchesStart) {
			const [, indent, tableSyntax, attr] = matchesStart;
			push(`${indent}\x00${accum.length}b\x7f`, top);
			const table = new TableToken('table', tableSyntax, attr, config, accum);
			stack.push(...top ? [top] : [], table);
			continue;
		} else if (!top) {
			out += line;
			continue;
		}
		const matches = line.match(
			/^(?:(\|}|\x00\d+!\x7f}|\x00\d+}\x7f)|((?:\|-|\x00\d+!\x7f-|\x00\d+-\x7f)-*)|(!|(?:\||\x00\d+!\x7f)\+?))(.*)$/,
		);
		if (!matches) {
			push(line, top);
			stack.push(...top ? [top] : []);
			continue;
		}
		const [, closing, row, cell, attr] = matches;
		if (closing) {
			while (top.type !== 'table') {
				top = stack.pop();
			}
			top.setAttribute('closing', closing);
			push(attr, stack.at(-1));
		} else if (row) {
			if (top.type === 'td') {
				top = stack.pop();
			}
			if (top.type === 'tr') {
				top = stack.pop();
			}
			const tr = new TableToken('tr', row, attr, config, accum);
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
				lastSyntax = cell;
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
			push(line, top);
		}
	}
	return out.slice(1);
};

Parser.parsers.parseTable = __filename;
module.exports = parseTable;
