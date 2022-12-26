'use strict';

/**
 * remove half-parsed comment-like tokens
 * @param {string} str
 */
const removeComment = str => str.replace(/\x00\d+c\x7f/g, '');

/** @param {string} str */
const ucfirst = str => str && `${str[0].toUpperCase()}${str.slice(1)}`;

/** @param {(string|AstNode)[]} childNodes */
const text = (childNodes, separator = '') => {
	const AstNode = require('../lib/node');
	return childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
};

/**
 * @param {(string|AstNode)[]} childNodes
 * @param {printOpt} opt
 */
const print = (childNodes, opt = {}) => {
	const AstNode = require('../lib/node'),
		{pre = '', post = '', sep = ''} = opt;
	return `${pre}${childNodes.map(child => typeof child === 'string'
		? child.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
		: `</span>${child.print()}<span class="${opt.parent}">`,
	).join(sep)}${post}`;
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
	/** @param {string} str */
	const escapeRegExp = string => string.replace(/[\\{}()|.?*+\-^$[\]]/g, '\\$&');
	const regex = new RegExp(`${[start, end, separator].map(escapeRegExp).join('|')}`, 'g'),
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

const extUrlChar = '(?:[\\d.]+|\\[[\\da-f:.]+\\]|[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd])'
	+ '(?:[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd]|\\x00\\d+c\\x7f)*';

module.exports = {removeComment, ucfirst, text, print, explode, extUrlChar};
