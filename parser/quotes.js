'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} text
 * @param {accum} accum
 */
const parseQuotes = (text, config = Parser.getConfig(), accum = []) => {
	const arr = text.split(/('{2,})/),
		{length} = arr;
	if (length === 1) {
		return text;
	}
	let nBold = 0,
		nItalic = 0,
		firstSingle, firstMulti, firstSpace;
	for (let i = 1; i < length; i += 2) {
		const len = arr[i].length;
		switch (len) {
			case 2:
				nItalic++;
				break;
			case 4:
				arr[i - 1] += "'";
				arr[i] = "'''";
				// fall through
			case 3:
				nBold++;
				if (firstSingle) {
					break;
				} else if (arr[i - 1].at(-1) === ' ') {
					if (!firstMulti && !firstSpace) {
						firstSpace = i;
					}
				} else if (arr[i - 1].at(-2) === ' ') {
					firstSingle = i;
				} else if (!firstMulti) {
					firstMulti = i;
				}
				break;
			default:
				arr[i - 1] += "'".repeat(len - 5);
				arr[i] = "'''''";
				nItalic++;
				nBold++;
		}
	}
	if (nItalic % 2 === 1 && nBold % 2 === 1) {
		const i = firstSingle ?? firstMulti ?? firstSpace;
		arr[i] = "''";
		arr[i - 1] += "'";
	}
	const QuoteToken = require('../src/nowiki/quote');
	for (let i = 1; i < length; i += 2) {
		new QuoteToken(arr[i].length, config, accum);
		arr[i] = `\x00${accum.length - 1}q\x7f`;
	}
	return arr.join('');
};

Parser.parsers.parseQuotes = __filename;
module.exports = parseQuotes;
