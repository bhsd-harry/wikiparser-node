'use strict';

/**
 * optionally convert to lower cases
 * @param {string} val
 * @param {string|undefined} i
 */
const toCase = (val, i) => i ? val.toLowerCase() : val;

/**
 * remove half-parsed comment-like tokens
 * @param {string} str
 */
const removeComment = str => str.replace(/\0\d+c\x7f/g, '');

/** @param {string} str */
const ucfirst = str => str && `${str[0].toUpperCase()}${str.slice(1)}`;

/** @param {string} str */
const escapeRegExp = str => str.replace(/[\\{}()|.?*+\-^$[\]]/g, '\\$&');

/** @param {(string|AstNode)[]} childNodes */
const text = (childNodes, separator = '') => {
	const AstNode = require('../lib/node');
	return childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
};

/**
 * @param {string} start
 * @param {string} end
 * @param {string} separator
 * @param {string} str
 */
const explode = (start, end, separator, str) => {
	if (str === undefined) {
		return [];
	}
	const regex = RegExp(`${[start, end, separator].map(escapeRegExp).join('|')}`, 'g'),
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

/** @param {string} str */
const noWrap = str => str.replaceAll('\n', '\\n');

/**
 * @param {string|Token} token
 * @returns {string}
 */
const normalizeSpace = (token = '', separator = '') => {
	const Token = require('../src');
	return typeof token === 'string'
		? token.replaceAll('\n', ' ')
		: token.childNodes.map(child => typeof child === 'string' ? normalizeSpace(child) : child.toString())
			.join(separator);
};

const extUrlChar = '(?:[\\d.]+|\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1f\\x7f\\p{Zs}\\ufffd])'
	+ '(?:[^[\\]<>"\\0-\\x1f\\x7f\\p{Zs}\\ufffd]|\\0\\d+c\\x7f)*';

module.exports = {toCase, removeComment, ucfirst, escapeRegExp, text, explode, noWrap, normalizeSpace, extUrlChar};
