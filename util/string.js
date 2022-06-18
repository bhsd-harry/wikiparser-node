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

const extUrlChar = '(?:[\\d.]+|\\[[\\da-f:.]+\\]|[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd])'
	+ '(?:[^[\\]<>"\\x00-\\x20\\x7f\\p{Zs}\\ufffd]|\\x00\\d+c\\x7f)*';

module.exports = {toCase, removeComment, ucfirst, extUrlChar};
