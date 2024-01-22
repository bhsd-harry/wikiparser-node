import * as Parser from '../index';
import type {LintError, Severity} from '../base';
import type {AstNodes} from '../internal';

declare type generator = (
	token: AstNodes,
	boundingRect: BoundingRect | {start: number},
	msg: string,
	severity?: Severity,
) => LintError;

/**
 * 生成lint函数
 * @param func lint函数
 */
const factory = (
	func: (
		token: AstNodes,
		start: number,
		top: number,
		left: number,
	) => Pick<LintError, 'startIndex' | 'startLine' | 'startCol'>,
): generator => (token, boundingRect, msg, severity = 'error') => {
	const {start} = boundingRect,
		{top, left} = 'top' in boundingRect ? boundingRect : token.getRootNode().posFromIndex(start)!,
		{offsetHeight, offsetWidth} = token,
		{startIndex, startLine, startCol} = func(token, start, top, left);
	return {
		message: Parser.msg(msg),
		severity,
		startIndex,
		endIndex: startIndex + String(token).length,
		startLine,
		endLine: startLine + offsetHeight - 1,
		startCol,
		endCol: offsetHeight === 1 ? startCol + offsetWidth : offsetWidth,
	};
};

export const generateForChild = factory((child, start, line, col) => {
	const index = child.getRelativeIndex(),
		{top, left} = child.parentNode!.posFromIndex(index)!;
	return {
		startIndex: start + index,
		startLine: line + top,
		startCol: top ? left : col + left,
	};
});

export const generateForSelf = factory((_, startIndex, startLine, startCol) => ({startIndex, startLine, startCol}));
