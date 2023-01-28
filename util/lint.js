'use strict';

const Token = require('../src');

/**
 * 生成对于子节点的LintError对象
 * @param {Token} child 子节点
 * @param {{top: number, left: number, token: Token, start: number}} boundingRect 父节点的绝对定位
 * @param {string} message 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForChild = (child, boundingRect, message, severity = 'error') => {
	const index = child.getRelativeIndex(),
		{offsetHeight, offsetWidth, parentNode, length} = child,
		{top: offsetTop, left: offsetLeft} = parentNode.posFromIndex(index),
		{token, start} = boundingRect,
		{top, left} = token ? token.getRootNode().posFromIndex(start) : boundingRect,
		startIndex = start + index,
		endIndex = startIndex + length,
		startLine = top + offsetTop,
		endLine = startLine + offsetHeight - 1,
		startCol = offsetTop ? offsetLeft : left + offsetLeft,
		endCol = offsetHeight > 1 ? offsetWidth : startCol + offsetWidth,
		excerpt = String(child).slice(0, 50);
	return {message, severity, startIndex, endIndex, startLine, endLine, startCol, endCol, excerpt};
};

/**
 * 生成对于自己的LintError对象
 * @param {Token} token 节点
 * @param {{top: number, left: number, start: number}} boundingRect 绝对定位
 * @param {string} message 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForSelf = (token, boundingRect, message, severity = 'error') => {
	const {start} = boundingRect,
		{offsetHeight, offsetWidth, length} = token,
		{top, left} = 'top' in boundingRect ? boundingRect : token.getRootNode().posFromIndex(start);
	return {
		message,
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
