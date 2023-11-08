import * as Parser from '../index';
import type {AstNodeTypes} from '../lib/node';

export type BoundingRect = {top: number, left: number, start: number} | {start: number};

/**
 * 生成对于子节点的LintError对象
 * @param child 子节点
 * @param boundingRect 父节点的绝对定位
 * @param msg 错误信息
 * @param severity 严重程度
 */
export const generateForChild = (
	child: AstNodeTypes,
	boundingRect: BoundingRect,
	msg: string,
	severity: 'error' | 'warning' = 'error',
): Parser.LintError => {
	const index = child.getRelativeIndex(),
		{offsetHeight, offsetWidth, parentNode} = child,
		{top: offsetTop, left: offsetLeft} = parentNode!.posFromIndex(index)!,
		{start} = boundingRect,
		{top, left} = 'top' in boundingRect ? boundingRect : child.getRootNode().posFromIndex(start)!,
		str = String(child),
		excerpt = str.slice(0, 50),
		startIndex = start + index,
		endIndex = startIndex + str.length,
		startLine = top + offsetTop,
		endLine = startLine + offsetHeight - 1,
		startCol = offsetTop ? offsetLeft : left + offsetLeft,
		endCol = offsetHeight > 1 ? offsetWidth : startCol + offsetWidth;
	return {message: Parser.msg(msg), severity, startIndex, endIndex, startLine, endLine, startCol, endCol, excerpt};
};

/**
 * 生成对于自己的LintError对象
 * @param token 节点
 * @param boundingRect 绝对定位
 * @param msg 错误信息
 * @param severity 严重程度
 */
export const generateForSelf = (
	token: import('../src'),
	boundingRect: BoundingRect,
	msg: string,
	severity: 'error' | 'warning' = 'error',
): Parser.LintError => {
	const {start} = boundingRect,
		{offsetHeight, offsetWidth} = token,
		str = String(token),
		{top, left} = 'top' in boundingRect ? boundingRect : token.getRootNode().posFromIndex(start)!;
	return {
		message: Parser.msg(msg),
		severity,
		startIndex: start,
		endIndex: start + str.length,
		startLine: top,
		endLine: top + offsetHeight - 1,
		startCol: left,
		endCol: offsetHeight > 1 ? offsetWidth : left + offsetWidth,
		excerpt: str.slice(0, 50),
	};
};
