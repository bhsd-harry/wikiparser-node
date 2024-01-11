import Parser from '../index';
import type {LintError, Severity} from '../base';
import type {AstNodes, Token} from '../internal';

/**
 * 生成对于子节点的LintError对象
 * @param child 子节点
 * @param boundingRect 父节点的绝对定位
 * @param msg 错误信息
 * @param severity 严重程度
 */
export const generateForChild = (
	child: AstNodes,
	boundingRect: BoundingRect,
	msg: string,
	severity: Severity = 'error',
): LintError => {
	const index = child.getRelativeIndex(),
		{offsetHeight, offsetWidth, parentNode} = child,
		{top: offsetTop, left: offsetLeft} = parentNode!.posFromIndex(index)!,
		{start} = boundingRect,
		{top, left} = 'top' in boundingRect ? boundingRect : child.getRootNode().posFromIndex(start)!,
		startIndex = start + index,
		startLine = top + offsetTop,
		startCol = offsetTop ? offsetLeft : left + offsetLeft;
	return {
		message: Parser.msg(msg),
		severity,
		startIndex,
		endIndex: startIndex + String(child).length,
		startLine,
		endLine: startLine + offsetHeight - 1,
		startCol,
		endCol: offsetHeight === 1 ? startCol + offsetWidth : offsetWidth,
	};
};

/**
 * 生成对于自己的LintError对象
 * @param token 节点
 * @param boundingRect 绝对定位
 * @param msg 错误信息
 * @param severity 严重程度
 */
export const generateForSelf = (
	token: Token,
	boundingRect: BoundingRect,
	msg: string,
	severity: Severity = 'error',
): LintError => {
	const {start} = boundingRect,
		{offsetHeight, offsetWidth} = token,
		{top, left} = 'top' in boundingRect ? boundingRect : token.getRootNode().posFromIndex(start)!;
	return {
		message: Parser.msg(msg),
		severity,
		startIndex: start,
		endIndex: start + String(token).length,
		startLine: top,
		endLine: top + offsetHeight - 1,
		startCol: left,
		endCol: offsetHeight === 1 ? left + offsetWidth : offsetWidth,
	};
};
