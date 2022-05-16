'use strict';

const MAX_STAGE = 11;

// ------------------------------ string conversion ------------------------------ //

const numberToString = n => typeof n === 'number' ? String(n) : n;

/** @param {string} str */
const removeComment = (str, trimming = true) => {
	str = str.replace(/<!--.*?-->|\x00\d+c\x7f/g, '');
	return trimming ? str.trim() : str;
};

/** @param {boolean} i */
const toCase = (val, i) => i ? String(val).toLocaleLowerCase() : String(val);

/**
 * @param {string} str
 * @param {?number} i
 */
const nth = (str, i) => {
	if (i === null || i < 0) {
		return false;
	}
	const {Ranges} = require('./range');
	return new Ranges(str.split(',')).applyTo(new Array(i + 1)).includes(i);
};

// ------------------------------ filter related ------------------------------ //

/** 判断是否是string或Token */
const tokenLike = token => {
	const Token = require('./token');
	return typeof token === 'string' || token instanceof Token;
};

/**
 * 判断单个Token是否满足选择器
 * @param {Token|string|undefined} selector
 * @param {Token|string} token
 */
const tokenIs = (selector, token) => {
	const Token = require('./token');
	return selector === undefined || token instanceof Token && token.is(selector);
};

/**
 * 筛选满足选择器的单个Token
 * @param {Token|string|undefined} selector
 * @param {Token|string} token
 * @returns {?Token|string}
 */
const select = (selector, token) => tokenIs(selector, token) ? token : null;

/**
 * 筛选满足选择器的多个Token
 * @param {Token|string|undefined} selector
 * @param {TokenCollection} $tokens
 * @returns {TokenCollection}
 */
const selects = (selector, $tokens) =>
	selector === undefined ? $tokens : $tokens.filter(token => tokenIs(selector, token));

// ------------------------------ debugging tool ------------------------------ //

/**
 * @param {...string} args
 * @throws TypeError
 */
const typeError = (...args) => {
	throw new TypeError(`仅接受${args.join('、')}作为输入参数！`);
};

const caller = () => {
	try {
		throw new Error();
	} catch ({stack}) {
		const /** @type {string[]} */ mt = stack.match(/(?<=^\s+at )(?:new )?[\w.]+(?= \((?!<anonymous>))/gm);
		return mt.slice(1);
	}
};

const externalUse = () => {
	return !caller().slice(2).some(str => /^new \w*Token$|^\w*Token\.(?!each)/.test(str));
};

module.exports = {
	MAX_STAGE,
	numberToString, removeComment, toCase, nth,
	tokenLike, tokenIs, select, selects,
	typeError, caller, externalUse,
};
