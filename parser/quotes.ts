import {QuoteToken} from '../src/nowiki/quote';
import type {Config} from '../base';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {parsers} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 解析单引号
 * @param wikitext
 * @param config
 * @param accum
 * @param tidy 是否整理
 */
export const parseQuotes = (wikitext: string, config: Config, accum: Token[], tidy?: boolean): string => {
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
		const len = arr[i]!.length;
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
				} else if (arr[i - 1]!.slice(-2, -1) === ' ') {
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
	let bold = true,
		italic = true;
	for (let i = 1; i < length; i += 2) {
		const n = arr[i]!.length,
			isBold = n !== 2,
			isItalic = n !== 3;
		if (isBold) {
			bold = !bold;
		}
		if (isItalic) {
			italic = !italic;
		}
		// @ts-expect-error abstract class
		new QuoteToken(
			arr[i],
			{bold: isBold && bold, italic: isItalic && italic},
			config,
			accum,
		);
		arr[i] = `\0${accum.length - 1}q\x7F`;
	}

	/* NOT FOR BROWSER */

	if (tidy && (!bold || !italic)) {
		// @ts-expect-error abstract class
		new QuoteToken(
			(bold ? '' : `'''`) + (italic ? '' : `''`),
			{bold: !bold, italic: !italic},
			config,
			accum,
		);
		arr.push(`\0${accum.length - 1}q\x7F`);
	}

	/* NOT FOR BROWSER END */

	return arr.join('');
};

parsers['parseQuotes'] = __filename;
