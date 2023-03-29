'use strict';

/** @typedef {import('../typings/parser').BracketExecArray} BracketExecArray */

const {removeComment} = require('../util/string'),
	Parser = require('..'),
	HeadingToken = require('../src/heading'),
	TranscludeToken = require('../src/transclude'),
	ArgToken = require('../src/arg');

/**
 * 解析花括号
 * @param {string} text wikitext
 * @param {import('../typings/token').accum} accum
 * @throws TranscludeToken.constructor()
 */
const parseBrackets = (text, config = Parser.getConfig(), accum = []) => {
	const source = `${config.excludes.includes('heading') ? '' : '^(\0\\d+c\x7F)*={1,6}|'}\\[\\[|\\{{2,}|-\\{(?!\\{)`,
		{parserFunction: [,,, subst]} = config,
		/** @type {BracketExecArray[]} */ stack = [],
		closes = {'=': '\n', '{': '\\}{2,}|\\|', '-': '\\}-', '[': '\\]\\]'},
		/** @type {Record<string, string>} */ marks = {'!': '!', '!!': '+', '(!': '{', '!)': '}', '!-': '-', '=': '~'};
	let regex = new RegExp(source, 'gmu'),
		/** @type {BracketExecArray} */ mt = regex.exec(text),
		moreBraces = text.includes('}}'),
		lastIndex;
	while (mt || lastIndex <= text.length && stack[stack.length - 1]?.[0]?.[0] === '=') {
		if (mt?.[1]) {
			const [, {length}] = mt;
			mt[0] = mt[0].slice(length);
			mt.index += length;
		}
		const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: text.length},
			/** @type {BracketExecArray} */ top = stack.pop() ?? {},
			{0: open, index, parts, findEqual: topFindEqual, pos: topPos} = top,
			innerEqual = syntax === '=' && topFindEqual;
		if (syntax === ']]' || syntax === '}-') { // 情形1：闭合内链或转换
			lastIndex = curIndex + 2;
		} else if (syntax === '\n') { // 情形2：闭合标题
			lastIndex = curIndex + 1;
			const {pos, findEqual} = stack[stack.length - 1] ?? {};
			if (!pos || findEqual || removeComment(text.slice(pos, index)) !== '') {
				const rmt = /^(={1,6})(.+)\1((?:\s|\0\d+c\x7F)*)$/u.exec(text.slice(index, curIndex));
				if (rmt) {
					text = `${text.slice(0, index)}\0${accum.length}h\x7F${text.slice(curIndex)}`;
					lastIndex = index + 4 + String(accum.length).length;
					new HeadingToken(rmt[1].length, rmt.slice(2), config, accum);
				}
			}
		} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
			lastIndex = curIndex + 1;
			parts[parts.length - 1].push(text.slice(topPos, curIndex));
			if (syntax === '|') {
				parts.push([]);
			}
			top.pos = lastIndex;
			top.findEqual = syntax === '|';
			stack.push(top);
		} else if (syntax.startsWith('}}')) { // 情形4：闭合模板
			const close = syntax.slice(0, Math.min(open.length, 3)),
				rest = open.length - close.length,
				{length} = accum;
			lastIndex = curIndex + close.length; // 这不是最终的lastIndex
			parts[parts.length - 1].push(text.slice(topPos, curIndex));
			let skip = false,
				ch = 't';
			if (close.length === 3) {
				const argParts = parts.map(part => part.join('=')),
					str = argParts.length > 1 && removeComment(argParts[1]).trim();
				new ArgToken(argParts, config, accum);
				if (str && str.endsWith(':') && subst.includes(str.slice(0, -1).toLowerCase())) {
					ch = 's';
				}
			} else {
				try {
					new TranscludeToken(parts[0][0], parts.slice(1), config, accum);
					const name = removeComment(parts[0][0]).trim();
					if (name in marks) {
						ch = marks[name]; // 标记{{!}}等
					} else if (/^(?:filepath|(?:full|canonical)urle?):.|^server$/iu.test(name)) {
						ch = 'm';
					} else if (/^#vardefine:./iu.test(name)) {
						ch = 'c';
					}
				} catch (e) {
					if (e instanceof Error && e.message.startsWith('非法的模板名称：')) {
						lastIndex = index + open.length;
						skip = true;
					} else {
						throw e;
					}
				}
			}
			if (!skip) {
				text = `${text.slice(0, index + rest)}\0${length}${ch}\x7F${text.slice(lastIndex)}`;
				lastIndex = index + rest + 3 + String(length).length;
				if (rest > 1) {
					stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
				} else if (rest === 1 && text[index - 1] === '-') {
					stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
				}
			}
		} else { // 情形5：开启
			lastIndex = curIndex + syntax.length;
			if (syntax[0] === '{') {
				mt.pos = lastIndex;
				mt.parts = [[]];
			}
			stack.push(...'0' in top ? [top] : [], mt);
		}
		moreBraces &&= text.slice(lastIndex).includes('}}');
		let curTop = stack[stack.length - 1];
		if (!moreBraces && curTop?.[0]?.[0] === '{') {
			stack.pop();
			curTop = stack[stack.length - 1];
		}
		regex = new RegExp(source + (curTop
			? `|${closes[curTop[0][0]]}${curTop.findEqual ? '|=' : ''}`
			: ''
		), 'gmu');
		regex.lastIndex = lastIndex;
		mt = regex.exec(text);
	}
	return text;
};

module.exports = parseBrackets;
