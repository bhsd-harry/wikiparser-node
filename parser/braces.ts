import {getRegex} from '@bhsd/common';
import {removeComment} from '../util/string';
import {HeadingToken} from '../src/heading';
import {TranscludeToken} from '../src/transclude';
import {ArgToken} from '../src/arg';
import type {Config} from '../base';
import type {Token} from '../src/index';

const closes: Record<string, string> = {
		'=': String.raw`\n(?!(?:[^\S\n]|\0\d+[cn]\x7F)*\n)`,
		'{': String.raw`\}{2,}|\|`,
		'-': String.raw`\}-`,
		'[': String.raw`\]\]`,
	},
	lbrack = String.raw`\[(?!\[)`,
	newline = String.raw`\n(?![=\0])`,
	openBraces = String.raw`|\{{2,}`,
	marks = new Map([['!', '!'], ['!!', '+'], ['(!', '{'], ['!)', '}'], ['!-', '-'], ['=', '~'], ['server', 'm']]),
	getExecRegex = getRegex(s => new RegExp(s, 'gmu'));
let reReplace: RegExp;
// eslint-disable-next-line prefer-const
reReplace = new RegExp(
	String.raw`\{\{((?:[^\n{}[]|${lbrack}|${newline})*)\}\}(?!\})` // eslint-disable-line prefer-template
	+ '|'
	+ String.raw`\[\[(?:[^\n[\]{]|${newline})*\]\]`
	+ '|'
	+ String.raw`-\{(?:[^\n{}[]|${lbrack}|${newline})*\}-`,
	'gu',
);

/**
 * 获取模板或魔术字对应的字符
 * @param s 模板或魔术字名
 */
const getSymbol = (s: string): string => {
	const name = removeComment(s).trim().toLowerCase();
	if (marks.has(name)) {
		return marks.get(name)!; // 标记{{!}}等
	} else if (/^(?:filepath|(?:full|canonical)urle?):./u.test(name)) {
		return 'm';
	} else if (/^#vardefine:./u.test(name)) {
		return 'n';
	}
	return 't';
};

/**
 * 解析花括号
 * @param wikitext
 * @param config
 * @param accum
 * @throws `RangeError` Maximum iteration exceeded
 * @throws `TranscludeToken.constructor()`
 */
export const parseBraces = (wikitext: string, config: Config, accum: Token[]): string => {
	const source = String.raw`${
			config.excludes.includes('heading') ? '' : String.raw`^((?:\0\d+[cno]\x7F)*)={1,6}|`
		}\[\[|-\{(?!\{)`,
		{parserFunction: [,,, subst]} = config,
		stack: BraceExecArrayOrEmpty[] = [],
		linkStack: string[] = [];

	/**
	 * 恢复内链
	 * @param s 不含内链的字符串
	 */
	const restore = (s: string): string => s.replace(/\0(\d+)\x7F/gu, (_, p1: number) => linkStack[p1]!);

	/**
	 * 填入模板内容
	 * @param text wikitext全文
	 * @param parts 模板参数
	 * @param lastIndex 匹配的起始位置
	 * @param index 匹配位置
	 */
	const push = (text: string, parts: string[][], lastIndex: number, index: number): void => {
		parts[parts.length - 1]!.push(restore(text.slice(lastIndex, index)));
	};
	let replaced: string | undefined;
	do {
		if (replaced !== undefined) {
			wikitext = replaced;
		}
		replaced = wikitext.replace(
			reReplace,
			(m, p1?: string, p2?: string) => {
				if (p1 !== undefined || typeof p2 === 'string') {
					try {
						const {length} = accum,
							parts = (p1 ?? p2!).split('|');
						// @ts-expect-error abstract class
						new TranscludeToken(
							restore(parts[0]!),
							parts.slice(1).map(part => {
								const i = part.indexOf('=');
								return (i === -1 ? [part] : [part.slice(0, i), part.slice(i + 1)]).map(restore);
							}),
							config,
							accum,
						);
						return `\0${length}${getSymbol(parts[0]!)}\x7F`;
					} catch (e) {
						/* istanbul ignore if */
						if (!(e instanceof SyntaxError) || e.message !== 'Invalid template name') {
							throw e;
						}
					}
				}
				linkStack.push(restore(m));
				return `\0${linkStack.length - 1}\x7F`;
			},
		);
	} while (replaced !== wikitext);
	wikitext = replaced;
	const lastBraces = wikitext.lastIndexOf('}}') - wikitext.length;
	let moreBraces = lastBraces + wikitext.length !== -1;
	let regex = getExecRegex(source + (moreBraces ? openBraces : '')),
		mt: BraceExecArray | null = regex.exec(wikitext),
		lastIndex: number | undefined;
	while (
		mt
		|| lastIndex !== undefined && lastIndex <= wikitext.length
		&& stack[stack.length - 1]?.[0]?.startsWith('=')
	) {
		if (mt?.[1]) {
			const [, {length}] = mt;
			mt[0] = mt[0].slice(length);
			mt.index += length;
		}
		const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: wikitext.length},
			top: BraceExecArrayOrEmpty = stack.pop() ?? {},
			{0: open, index, parts, findEqual: topFindEqual, pos: topPos} = top,
			innerEqual = syntax === '=' && topFindEqual;
		if (syntax === ']]' || syntax === '}-') { // 情形1：闭合内链或转换
			lastIndex = curIndex + 2;
		} else if (syntax === '\n') { // 情形2：闭合标题或文末
			lastIndex = curIndex + 1;
			const {pos, findEqual} = stack[stack.length - 1] ?? {};
			if (pos === undefined || findEqual || removeComment(wikitext.slice(pos, index)) !== '') {
				const rmt = /^(={1,6})(.+)\1((?:\s|\0\d+[cn]\x7F)*)$/u
					.exec(wikitext.slice(index, curIndex)) as [string, string, string, string] | null;
				if (rmt) {
					rmt[2] = restore(rmt[2]);
					if (!rmt[2].includes('\n')) {
						wikitext = `${wikitext.slice(0, index)}\0${accum.length}h\x7F${
							wikitext.slice(curIndex)
						}`;
						lastIndex = index! + 4 + String(accum.length).length;
						// @ts-expect-error abstract class
						new HeadingToken(rmt[1].length, rmt.slice(2) as [string, string], config, accum);
					}
				}
			}
		} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
			lastIndex = curIndex + 1;
			push(wikitext, parts!, topPos!, curIndex);
			if (syntax === '|') {
				parts!.push([]);
			}
			top.pos = lastIndex;
			top.findEqual = syntax === '|';
			stack.push(top);
		} else if (syntax.startsWith('}}')) { // 情形4：闭合模板
			const close = syntax.slice(0, Math.min(open!.length, 3)),
				rest = open!.length - close.length,
				{length} = accum;
			lastIndex = curIndex + close.length; // 这不是最终的lastIndex
			push(wikitext, parts!, topPos!, curIndex);
			let skip = false,
				ch = 't';
			if (close.length === 3) {
				const argParts = parts!.map(part => part.join('=')),
					str = argParts.length > 1 && removeComment(argParts[1]!).trim();
				// @ts-expect-error abstract class
				new ArgToken(argParts, config, accum);
				if (
					str && str.endsWith(':')
					&& subst.includes(str.slice(0, -1).toLowerCase())
				) {
					ch = 's';
				}
			} else {
				try {
					// @ts-expect-error abstract class
					new TranscludeToken(
						parts![0]![0]!,
						parts!.slice(1) as ([string] | [string, string])[],
						config,
						accum,
					);
					ch = getSymbol(parts![0]![0]!);
				} catch (e) {
					/* istanbul ignore else */
					if (e instanceof SyntaxError && e.message === 'Invalid template name') {
						skip = true;
					} else {
						throw e;
					}
				}
			}
			if (!skip) {
				wikitext = `${wikitext.slice(0, index! + rest)}\0${length}${ch}\x7F${wikitext.slice(lastIndex)}`;
				lastIndex = index! + rest + 3 + String(length).length;
				if (rest > 1) {
					stack.push({0: open!.slice(0, rest), index: index!, pos: index! + rest, parts: [[]]});
				} else if (rest === 1 && wikitext[index! - 1] === '-') {
					stack.push({0: '-{', index: index! - 1, pos: index! + 1, parts: [[]]});
				}
			}
		} else { // 情形5：开启
			lastIndex = curIndex + syntax.length;
			if (syntax.startsWith('{')) {
				mt!.pos = lastIndex;
				mt!.parts = [[]];
			}
			stack.push(...'0' in top ? [top] : [], mt!);
		}
		let curTop = stack[stack.length - 1];
		if (moreBraces && lastBraces + wikitext.length < lastIndex) {
			moreBraces = false;
			while (curTop?.[0]?.startsWith('{')) {
				stack.pop();
				curTop = stack[stack.length - 1];
			}
		}
		regex = getExecRegex(
			source
			+ (moreBraces ? openBraces : '')
			+ (curTop ? `|${closes[curTop[0]![0]!]!}${curTop.findEqual ? '|=' : ''}` : ''),
		);
		regex.lastIndex = lastIndex;
		mt = regex.exec(wikitext);
	}
	return restore(wikitext);
};
