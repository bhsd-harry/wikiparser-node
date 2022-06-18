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

module.exports = {toCase, removeComment, ucfirst};
