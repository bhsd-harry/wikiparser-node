'use strict';

const extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])',
	extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*';

/**
 * remove half-parsed comment-like tokens
 * @param {string} str 原字符串
 */
const removeComment = str => str.replace(/\0\d+c\x7F/gu, '');

/**
 * 以HTML格式打印
 * @param {(AstText|AstElement)[]} childNodes 子节点
 * @param {printOpt} opt 选项
 */
const print = (childNodes, opt = {}) => {
	const AstText = require('../lib/text'),
		AstElement = require('../lib/element');
	const {pre = '', post = '', sep = ''} = opt,
		entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
	return `${pre}${childNodes.map(
		child => child instanceof AstElement
			? child.print()
			: String(child).replace(/[&<>]/gu, p => `&${entities[p]};`),
	).join(sep)}${post}`;
};

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

/**
 * decode HTML entities
 * @param {string} str 原字符串
 */
const decodeHtml = str => str?.replace(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code) => String.fromCodePoint(`${code[0].toLowerCase() === 'x' ? '0' : ''}${code}`),
);

/**
 * optionally convert to lower cases
 * @param {string} val 属性值
 * @param {string|undefined} i 是否对大小写不敏感
 */
const toCase = (val, i) => i ? val.toLowerCase() : val;

/**
 * escape newlines
 * @param {string} str 原字符串
 */
const noWrap = str => str.replaceAll('\n', '\\n');

/**
 * convert newline in text nodes to single whitespace
 * @param {Token & {childNodes: AstText[]}} token 父节点
 */
const normalizeSpace = token => {
	if (token === undefined) {
		return;
	}
	const Token = require('../src'),
		AstText = require('../lib/text');
	for (const child of token.childNodes) {
		if (child.type === 'text') {
			child.replaceData(child.data.replaceAll('\n', ' '));
		}
	}
};

module.exports = {
	extUrlCharFirst,
	extUrlChar,
	removeComment,
	print,
	escapeRegExp,
	explode,
	text,
	decodeHtml,
	toCase,
	noWrap,
	normalizeSpace,
};
