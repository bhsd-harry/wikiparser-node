'use strict';

/**
 * optionally convert to lower cases
 * @param {string} val
 * @param {boolean} i
 */
const toCase = (val, i) => i ? val.toLowerCase() : val;

/**
 * remove half-parsed comment-like tokens
 * @param {string} str
 */
const removeComment = str => str.replace(/\x00\d+c\x7f/g, '');

/** @param {string} str */
const ucfirst = str => str && `${str[0].toUpperCase()}${str.slice(1)}`;

/** @param {string} str */
const escapeRegExp = str => str.replace(/[\\{}()|.?*+\-^$[\]]/g, '\\$&');

/** @param {(string|AstNode)[]} childNodes */
const text = (childNodes, separator = '') => {
	const AstNode = require('../lib/node'); // eslint-disable-line no-unused-vars
	return childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
};

const extUrlChar = '(?:[\\d.]+|\\[[\\da-f:.]+\\]|[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd])'
	+ '[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd]*';

module.exports = {toCase, removeComment, ucfirst, escapeRegExp, text, extUrlChar};
