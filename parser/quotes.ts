import Parser from '../index';
import {QuoteToken} from '../src/nowiki/quote';
import type {Token} from '../src';

/**
 * 解析单引号
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseQuotes = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const arr = wikitext.split(/('{2,})/u),
		{length} = arr;
	if (length === 1) {
		return wikitext;
	}
	let nBold = 0,
		nItalic = 0,
		firstSingle: number | undefined,
		firstMulti: number | undefined,
		firstSpace: number | undefined;
	for (let i = 1; i < length; i += 2) {
		const {length: len} = arr[i]!;
		switch (len) {
			case 2:
				nItalic++;
				break;
			case 4:
				arr[i - 1] += `'`;
				arr[i] = `'''`;
				// fall through
			case 3:
				nBold++;
				if (firstSingle !== undefined) {
					break;
				} else if (arr[i - 1]!.endsWith(' ')) {
					if (firstMulti === undefined && firstSpace === undefined) {
						firstSpace = i;
					}
				} else if (arr[i - 1]!.at(-2) === ' ') {
					firstSingle = i;
				} else {
					firstMulti ??= i;
				}
				break;
			default:
				arr[i - 1] += `'`.repeat(len - 5);
				arr[i] = `'''''`;
				nItalic++;
				nBold++;
		}
	}
	if (nItalic % 2 === 1 && nBold % 2 === 1) {
		const i = firstSingle ?? firstMulti ?? firstSpace;
		if (i !== undefined) {
			arr[i] = `''`;
			arr[i - 1] += `'`;
		}
	}
	for (let i = 1; i < length; i += 2) {
		// @ts-expect-error abstract class
		new QuoteToken(arr[i]!, config, accum);
		arr[i] = `\0${accum.length - 1}q\x7F`;
	}
	return arr.join('');
};

Parser.parsers['parseQuotes'] = __filename;
