'use strict';

const extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])',
	extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*';

/**
 * remove half-parsed comment-like tokens
 * @param {string} str 原字符串
 */
const removeComment = str => str.replace(/\0\d+c\x7F/gu, '');

/**
 * escape special chars for RegExp constructor
 * @param {string} str RegExp source
 */
const escapeRegExp = str => str.replace(/[\\{}()|.?*+^$[\]]/gu, '\\$&');

/**
 * a more sophisticated string-explode function
 * @param {string} start start syntax of a nested AST node
 * @param {string} end end syntax of a nested AST node
 * @param {string} separator syntax for explosion
 * @param {string} str string to be exploded
 */
const explode = (start, end, separator, str) => {
	if (str === undefined) {
		return [];
	}
	const regex = new RegExp(`${[start, end, separator].map(escapeRegExp).join('|')}`, 'gu'),
		/** @type {string[]} */ exploded = [];
	let mt = regex.exec(str),
		depth = 0,
		lastIndex = 0;
	while (mt) {
		const {0: match, index} = mt;
		if (match !== separator) {
			depth += match === start ? 1 : -1;
		} else if (depth === 0) {
			exploded.push(str.slice(lastIndex, index));
			({lastIndex} = regex);
		}
		mt = regex.exec(str);
	}
	exploded.push(str.slice(lastIndex));
	return exploded;
};

/**
 * extract effective wikitext
 * @param {(string|AstNode)[]} childNodes a Token's contents
 * @param {string} separator delimiter between nodes
 */
const text = (childNodes, separator = '') => {
	const AstNode = require('../lib/node');
	return childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
};

module.exports = {
	extUrlCharFirst, extUrlChar, removeComment, escapeRegExp, explode, text,
};
