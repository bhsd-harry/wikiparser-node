'use strict';

const Parser = require('..'),
	QuoteToken = require('../src/nowiki/quote');

/**
 * 解析单引号
 * @param {string} text wikitext
 * @param {import('../typings/token').accum} accum
 */
const parseQuotes = (text, config = Parser.getConfig(), accum = []) => {
	const arr = text.split(/('{2,})/u),
		{length} = arr;
	if (length === 1) {
		return text;
	}
	let nBold = 0,
		nItalic = 0,
		firstSingle, firstMulti, firstSpace;
	for (let i = 1; i < length; i += 2) {
		const {length: len} = arr[i];
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
				if (firstSingle) {
					break;
				} else if (arr[i - 1].endsWith(' ')) {
					if (!firstMulti && !firstSpace) {
						firstSpace = i;
					}
				} else if (arr[i - 1].at(-2) === ' ') {
					firstSingle = i;
				} else {
					firstMulti ||= i;
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
		arr[i] = `''`;
		arr[i - 1] += `'`;
	}
	for (let i = 1; i < length; i += 2) {
		new QuoteToken(arr[i].length, config, accum);
		arr[i] = `\0${accum.length - 1}q\x7F`;
	}
	return arr.join('');
};

Parser.parsers.parseQuotes = __filename;
module.exports = parseQuotes;
