'use strict';

exports.extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])';
exports.extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*';

/**
 * remove half-parsed comment-like tokens
 * @browser
 * @param str 原字符串
 */
const removeComment = str => str.replace(/\0\d+c\x7F/gu, '');
exports.removeComment = removeComment;

/**
 * 以HTML格式打印
 * @browser
 * @param childNodes 子节点
 * @param opt 选项
 */
const print = (childNodes, opt = {}) => {
	const {pre = '', post = '', sep = ''} = opt,
		entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
	return `${pre}${childNodes.map(child => child.type === 'text'
		? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
		: child.print()).join(sep)}${post}`;
};
exports.print = print;

/**
 * escape special chars for RegExp constructor
 * @browser
 * @param str RegExp source
 */
const escapeRegExp = str => str.replace(/[\\{}()|.?*+^$[\]]/gu, '\\$&');
exports.escapeRegExp = escapeRegExp;

/**
 * a more sophisticated string-explode function
 * @browser
 * @param start start syntax of a nested AST node
 * @param end end syntax of a nested AST node
 * @param separator syntax for explosion
 * @param str string to be exploded
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
exports.explode = explode;

/**
 * extract effective wikitext
 * @browser
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
const text = (childNodes, separator = '') => childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);
exports.text = text;

/**
 * decode HTML entities
 * @browser
 * @param str 原字符串
 */
const decodeHtml = str => str.replace(/&#(\d+|x[\da-f]+);/giu, (_, code) => String.fromCodePoint(Number(`${code[0].toLowerCase() === 'x' ? '0' : ''}${code}`)));
exports.decodeHtml = decodeHtml;

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
const toCase = (val, i) => i ? val.toLowerCase() : val;
exports.toCase = toCase;

/**
 * escape newlines
 * @param str 原字符串
 */
const noWrap = str => str.replaceAll('\n', '\\n');
exports.noWrap = noWrap;

/**
 * convert newline in text nodes to single whitespace
 * @param token 父节点
 */
const normalizeSpace = token => {
	if (token) {
		for (const child of token.childNodes) {
			if (child.type === 'text') {
				child.replaceData(child.data.replaceAll('\n', ' '));
			}
		}
	}
};
exports.normalizeSpace = normalizeSpace;
