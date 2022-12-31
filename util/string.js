'use strict';

/**
 * optionally convert to lower cases
 * @param {string} val 属性值
 * @param {string|undefined} i 是否对大小写不敏感
 */
const toCase = (val, i) => i ? val.toLowerCase() : val;

/**
 * remove half-parsed comment-like tokens
 * @param {string} str 原字符串
 */
const removeComment = str => str.replaceAll(/\0\d+c\x7F/gu, '');

/**
 * initial in upper case
 * @param {string} str 原字符串
 */
const ucfirst = str => str && `${str[0].toUpperCase()}${str.slice(1)}`;

/**
 * escape special chars for RegExp constructor
 * @param {string} str RegExp source
 */
const escapeRegExp = str => str.replaceAll(/[\\{}()|.?*+\-^$[\]]/gu, '\\$&');

/**
 * extract effective wikitext
 * @param {(string|AstNode)[]} childNodes a Token's contents
 * @param {string} separator delimiter between nodes
 */
const text = (childNodes, separator = '') => {
	const AstNode = require('../lib/node');
	return childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
};

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
 * escape newlines
 * @param {string} str 原字符串
 */
const noWrap = str => str.replaceAll('\n', '\\n');

/**
 * convert newline in text nodes to single whitespace
 * @param {Token} token 父节点
 */
const normalizeSpace = token => {
	if (token === undefined) {
		return;
	}
	const Token = require('../src');
	const {childNodes} = token;
	for (let i = 0; i < childNodes.length; i++) {
		const child = childNodes[i];
		if (typeof child === 'string') {
			token.setText(child.replaceAll('\n', ' '), i);
		}
	}
};

const extUrlChar = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1f\\x7f\\p{Zs}\\ufffd])'
	+ '(?:[^[\\]<>"\\0-\\x1f\\x7f\\p{Zs}\\ufffd]|\\0\\d+c\\x7f)*';

module.exports = {toCase, removeComment, ucfirst, escapeRegExp, text, explode, noWrap, normalizeSpace, extUrlChar};
