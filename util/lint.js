'use strict';

const Token = require('../src');

/**
 * 生成对于子节点的LintError对象
 * @param {Token} child 子节点
 * @param {{top: number, left: number}} boundingRect 父节点的绝对定位
 * @param {string} message 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForChild = (child, boundingRect, message, severity = 'error') => {
	const {style: {top: offsetTop, left: offsetLeft, height, width}} = child,
		{top, left} = boundingRect,
		startLine = top + offsetTop,
		endLine = startLine + height - 1,
		startCol = offsetTop ? offsetLeft : left + offsetLeft,
		endCol = height > 1 ? width : startCol + width;
	return {message, severity, startLine, endLine, startCol, endCol};
};

/**
 * 生成对于自己的LintError对象
 * @param {Token} token 节点
 * @param {{top: number, left: number}} boundingRect 绝对定位
 * @param {string} message 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
const generateForSelf = (token, boundingRect, message, severity = 'error') => ({
	message,
	severity,
	startLine: boundingRect.top,
	endLine: boundingRect.top + token.offsetHeight - 1,
	startCol: boundingRect.left,
	endCol: token.offsetHeight > 1 ? token.offsetWidth : boundingRect.left + token.offsetWidth,
});

module.exports = {generateForChild, generateForSelf};
