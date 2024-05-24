import {removeComment, escapeRegExp} from '../util/string';
import {parsers} from '../util/constants';
import {HeadingToken} from '../src/heading';
import {TranscludeToken} from '../src/transclude';
import {ArgToken} from '../src/arg';
import type {Config} from '../base';
import type {Token} from '../src/index';

/**
 * 解析花括号
 * @param wikitext
 * @param config
 * @param accum
 * @throws TranscludeToken.constructor()
 */
export const parseBraces = (wikitext: string, config: Config, accum: Token[]): string => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	/\{\{\s*([!=]|!!|\(!|!\)|!-)\s*\}\}(?!\})/gu;
	const source = `${config.excludes?.includes('heading') ? '' : '^(\0\\d+c\x7F)*={1,6}|'}\\[\\[|\\{{2,}|-\\{(?!\\{)`,
		{parserFunction: [,,, subst]} = config,
		stack: BraceExecArrayOrEmpty[] = [],
		closes: Record<string, string> = {'=': '\n', '{': '\\}{2,}|\\|', '-': '\\}-', '[': '\\]\\]'},
		marks = new Map([['!', '!'], ['!!', '+'], ['(!', '{'], ['!)', '}'], ['!-', '-'], ['=', '~']]),
		re = new RegExp(`\\{\\{\\s*(${[...marks.keys()].map(escapeRegExp).join('|')})\\s*\\}\\}(?!\\})`, 'gu');
	wikitext = wikitext.replace(re, (m, p1: string) => {
		// @ts-expect-error abstract class
		new TranscludeToken(m.slice(2, -2), [], config, accum);
		return `\0${accum.length - 2}${marks.get(p1)}\x7F`;
	});
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	/^(\0\d+c\x7F)*={1,6}|\[\[|\{{2,}|-\{(?!\{)|[\n|=]|\}{2,}|\}-|\]\]/gmu;
	let regex = new RegExp(source, 'gmu'),
		mt: BraceExecArray | null = regex.exec(wikitext),
		moreBraces = wikitext.includes('}}'),
		lastIndex: number | undefined;
	while (
		mt
		|| lastIndex !== undefined && lastIndex <= wikitext.length && stack[stack.length - 1]?.[0]?.startsWith('=')
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

		/**
		 * 填入模板内容
		 * @param text wikitext全文
		 */
		const push = (text: string): void => {
			parts![parts!.length - 1]!.push(text.slice(topPos, curIndex));
		};
		if (syntax === ']]' || syntax === '}-') { // 情形1：闭合内链或转换
			lastIndex = curIndex + 2;
		} else if (syntax === '\n') { // 情形2：闭合标题或文末
			lastIndex = curIndex + 1;
			const {pos, findEqual} = stack[stack.length - 1] ?? {};
			if (pos === undefined || findEqual || removeComment(wikitext.slice(pos, index)) !== '') {
				const rmt = /^(={1,6})(.+)\1((?:\s|\0\d+c\x7F)*)$/u
					.exec(wikitext.slice(index, curIndex)) as [string, string, string, string] | null;
				if (rmt) {
					wikitext = `${wikitext.slice(0, index)}\0${accum.length}h\x7F${wikitext.slice(curIndex)}`;
					lastIndex = index! + 4 + String(accum.length).length;
					// @ts-expect-error abstract class
					new HeadingToken(rmt[1].length, rmt.slice(2) as [string, string], config, accum);
				}
			}
		} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
			lastIndex = curIndex + 1;
			push(wikitext);
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
			push(wikitext);
			let skip = false,
				ch = 't';
			if (close.length === 3) {
				const argParts = parts!.map(part => part.join('=')),
					str = argParts.length > 1 && removeComment(argParts[1]!).trim();
				// @ts-expect-error abstract class
				new ArgToken(argParts, config, accum);
				if (str && str.endsWith(':') && subst.includes(str.slice(0, -1).toLowerCase())) {
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
					const name = removeComment(parts![0]![0]!).trim();
					if (marks.has(name)) {
						ch = marks.get(name)!; // 标记{{!}}等
					} else if (/^(?:filepath|(?:full|canonical)urle?):.|^server$/iu.test(name)) {
						ch = 'm';
					} else if (/^#vardefine:./iu.test(name)) {
						ch = 'c';
					}
				} catch (e) {
					if (e instanceof SyntaxError && e.message === '非法的模板名称') {
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
		moreBraces &&= wikitext.slice(lastIndex).includes('}}');
		let curTop = stack[stack.length - 1];
		if (!moreBraces && curTop?.[0]?.startsWith('{')) {
			stack.pop();
			curTop = stack[stack.length - 1];
		}
		regex = new RegExp(
			source + (curTop ? `|${closes[curTop[0]![0]!]!}${curTop.findEqual ? '|=' : ''}` : ''),
			'gmu',
		);
		regex.lastIndex = lastIndex;
		mt = regex.exec(wikitext);
	}
	return wikitext;
};

parsers['parseBraces'] = __filename;
