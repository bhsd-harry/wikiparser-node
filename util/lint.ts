import {LazyLintError} from '../lib/error';
import type {LintError} from '../base';
import type {BoundingRect} from '../lib/rect';
import type {AstNodes} from '../internal';

declare type generator = (
	token: AstNodes,
	rect: BoundingRect | {start: number},
	rule: LintError.Rule,
	msg: string,
	severity?: LintError.Severity,
	lazy?: boolean,
) => LintError;

export type rangeGenerator = (
	token: AstNodes,
	start: number,
	top: number,
	left: number,
) => Pick<LintError, 'startIndex' | 'startLine' | 'startCol'>;

/**
 * 生成lint函数
 * @param func lint函数
 */
const factory = (func: rangeGenerator): generator => (token, rect, rule, msg, severity = 'error', lazy = false) => {
	const error = new LazyLintError(token, rect, func, rule, msg, severity);
	return lazy ? error : {...error, ...error.getRange()};
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
