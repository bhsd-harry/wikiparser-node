import {Shadow} from './debug';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import type {Position} from 'vscode-languageserver-types';
import type {IHTMLDataProvider, IValueData} from 'vscode-html-languageservice';
import type {LintError} from '../base';
import type {AstNodes} from '../internal';

export type Cached<T> = [number, T];

declare type generator = (
	token: AstNodes,
	rect: BoundingRect | {start: number},
	rule: LintError.Rule,
	msg: string,
	severity?: LintError.Severity,
) => LintError;

/**
 * 计算结束位置
 * @param top 起始行
 * @param left 起始列
 * @param height 高度
 * @param width 宽度
 */
export const getEndPos = (top: number, left: number, height: number, width: number): Position => ({
	line: top + height - 1,
	character: (height === 1 ? left : 0) + width,
});

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
): generator => (token, rect, rule, msg, severity = 'error') => {
	const {start} = rect,
		{top, left} = rect instanceof BoundingRect ? rect : new BoundingRect(token, start),
		{offsetHeight, offsetWidth} = token,
		{startIndex, startLine, startCol} = func(token, start, top, left),
		{line, character} = getEndPos(startLine, startCol, offsetHeight, offsetWidth);
	return {
		rule,
		message: Parser.msg(msg),
		severity,
		startIndex,
		endIndex: startIndex + token.toString().length,
		startLine,
		endLine: line,
		startCol,
		endCol: character,
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

/**
 * 缓存计算结果
 * @param store 缓存的值
 * @param compute 计算新值的函数
 * @param update 更新缓存的函数
 */
export const cache = <T>(store: Cached<T> | undefined, compute: () => T, update: (value: Cached<T>) => void): T => {
	if (
		store
	) {
		return store[1];
	}
	const result = compute();
	update([Shadow.rev, result]);
	return result;
};

let htmlData: Partial<IHTMLDataProvider> & Pick<IHTMLDataProvider, 'provideValues'>;
try {
	htmlData = (require('vscode-html-languageservice') as typeof import('vscode-html-languageservice'))
		.getDefaultHTMLDataProvider();
} catch {
	htmlData = {
		/** @implements */
		provideValues(tag, attributes): IValueData[] {
			if (tag === 'ol' && attributes === 'type') {
				return [{name: '1'}, {name: 'a'}, {name: 'A'}, {name: 'i'}, {name: 'I'}];
			} else if (tag === 'th' && attributes === 'scope') {
				return [{name: 'row'}, {name: 'col'}, {name: 'rowgroup'}, {name: 'colgroup'}];
			} else if (attributes === 'dir') {
				return [{name: 'ltr'}, {name: 'rtl'}, {name: 'auto'}];
			}
			return attributes === 'aria-hidden' ? [{name: 'true'}, {name: 'false'}] : [];
		},
	};
}
export {htmlData};
