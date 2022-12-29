'use strict';

const {removeComment} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..');

/**
 * @param {string} text
 * @param {accum} accum
 */
const parseBrackets = (text, config = Parser.getConfig(), accum = []) => {
	const source = '^(\0\\d+c\x7f)*={1,6}|\\[\\[|\\{{2,}|-\\{(?!\\{)',
		/** @type {BracketExecArray[]} */ stack = [],
		closes = {'=': '\n', '{': '}{2,}|\\|', '-': '}-', '[': ']]'},
		/** @type {Record<string, string>} */ marks = {'!': '!', '!!': '+', '(!': '{', '!)': '}', '!-': '-', '=': '~'};
	let regex = RegExp(source, 'gm'),
		/** @type {BracketExecArray} */ mt = regex.exec(text),
		moreBraces = text.includes('}}'),
		lastIndex;
	while (mt || lastIndex <= text.length && stack.at(-1)?.[0]?.[0] === '=') {
		if (mt?.[1]) {
			const [, {length}] = mt;
			mt[0] = mt[0].slice(length);
			mt.index += length;
		}
		const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: text.length},
			/** @type {BracketExecArray} */ top = stack.pop() ?? {},
			{0: open, index, parts} = top,
			innerEqual = syntax === '=' && top.findEqual;
		if (syntax === ']]' || syntax === '}-') { // 情形1：闭合内链或转换
			lastIndex = curIndex + 2;
		} else if (syntax === '\n') { // 情形2：闭合标题
			lastIndex = curIndex + 1;
			const {pos, findEqual} = stack.at(-1) ?? {};
			if (!pos || findEqual || removeComment(text.slice(pos, index)) !== '') {
				const rmt = /^(={1,6})(.+)\1((?:\s|\0\d+c\x7f)*)$/.exec(text.slice(index, curIndex));
				if (rmt) {
					text = `${text.slice(0, index)}\0${accum.length}h\x7f${text.slice(curIndex)}`;
					lastIndex = index + 4 + String(accum.length).length;
					const HeadingToken = require('../src/heading');
					new HeadingToken(rmt[1].length, rmt.slice(2), config, accum);
				}
			}
		} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
			lastIndex = curIndex + 1;
			parts.at(-1).push(text.slice(top.pos, curIndex));
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
			parts.at(-1).push(text.slice(top.pos, curIndex));
			/* 标记{{!}}等 */
			const ch = close.length === 2 ? marks[removeComment(parts[0][0])] ?? 't' : 't';
			let skip = false;
			if (close.length === 3) {
				const ArgToken = require('../src/arg');
				new ArgToken(parts.map(part => part.join('=')), config, accum);
			} else {
				try {
					const TranscludeToken = require('../src/transclude');
					new TranscludeToken(parts[0][0], parts.slice(1), config, accum);
				} catch (e) {
					if (e instanceof Error && e.message.startsWith('非法的模板名称：')) {
						lastIndex = index + open.length;
						skip = true;
					}
				}
			}
			if (!skip) {
				/* 标记{{!}}结束 */
				text = `${text.slice(0, index + rest)}\0${length}${ch}\x7f${text.slice(lastIndex)}`;
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
		let curTop = stack.at(-1);
		if (!moreBraces && curTop?.[0]?.[0] === '{') {
			stack.pop();
			curTop = stack.at(-1);
		}
		regex = RegExp(source + (curTop
			? `|${closes[curTop[0][0]]}${curTop.findEqual ? '|=' : ''}`
			: ''
		), 'gm');
		regex.lastIndex = lastIndex;
		mt = regex.exec(text);
	}
	return text;
};

module.exports = parseBrackets;
