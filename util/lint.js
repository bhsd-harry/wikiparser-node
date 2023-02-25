'use strict';

const Parser = require('..'),
	Token = require('../src');

/**
 * 生成对于子节点的LintError对象
 * @param {Token} child 子节点
 * @param {{top: number, left: number, start: number}} boundingRect 父节点的绝对定位
 * @param {string} msg 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForChild = (child, boundingRect, msg, severity = 'error') => {
	const index = child.getRelativeIndex(),
		{offsetHeight, offsetWidth, parentNode, length} = child,
		{top: offsetTop, left: offsetLeft} = parentNode.posFromIndex(index),
		{start} = boundingRect,
		{top, left} = 'top' in boundingRect ? boundingRect : child.getRootNode().posFromIndex(start),
		excerpt = String(child).slice(0, 50),
		startIndex = start + index,
		endIndex = startIndex + length,
		startLine = top + offsetTop,
		endLine = startLine + offsetHeight - 1,
		startCol = offsetTop ? offsetLeft : left + offsetLeft,
		endCol = offsetHeight > 1 ? offsetWidth : startCol + offsetWidth;
	return {message: Parser.msg(msg), severity, startIndex, endIndex, startLine, endLine, startCol, endCol, excerpt};
};

/**
 * 生成对于自己的LintError对象
 * @param {Token} token 节点
 * @param {{top: number, left: number, start: number}} boundingRect 绝对定位
 * @param {string} msg 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForSelf = (token, boundingRect, msg, severity = 'error') => {
	const {start} = boundingRect,
		{offsetHeight, offsetWidth, length} = token,
		{top, left} = 'top' in boundingRect ? boundingRect : token.getRootNode().posFromIndex(start);
	return {
		message: Parser.msg(msg),
		severity,
		startIndex: start,
		endIndex: start + length,
		startLine: top,
		endLine: top + offsetHeight - 1,
		startCol: left,
		endCol: offsetHeight > 1 ? offsetWidth : left + offsetWidth,
		excerpt: String(token).slice(0, 50),
	};
};

module.exports = {generateForChild, generateForSelf};
