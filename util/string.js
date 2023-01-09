'use strict';

/**
 * remove half-parsed comment-like tokens
 * @param {string} str 原字符串
 */
const removeComment = str => str.replaceAll(/\0\d+c\x7F/gu, '');

/**
 * 以HTML格式打印
 * @param {(AstText|AstElement)[]} childNodes 子节点
 * @param {printOpt} opt 选项
 */
const print = (childNodes, opt = {}) => {
	const AstText = require('../lib/text'),
		AstElement = require('../lib/element');
	const {pre = '', post = '', sep = ''} = opt;
	return `${pre}${childNodes.map(
		child => child instanceof AstElement
			? child.print()
			: String(child).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
	).join(sep)}${post}`;
};

/**
 * escape special chars for RegExp constructor
 * @param {string} str RegExp source
 */
const escapeRegExp = str => str.replaceAll(/[\\{}()|.?*+^$[\]]/gu, '\\$&');

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

const extUrlChar = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])'
	+ '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*';

module.exports = {removeComment, print, escapeRegExp, explode, extUrlChar};
