import {Shadow} from './debug';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import type {Position} from 'vscode-languageserver-types';
import type {LintError} from '../base';
import type {AstNodes, HtmlToken, ArgToken, TranscludeToken} from '../internal';

export type Cached<T> = [number, T];

declare type generator = (
	token: AstNodes,
	rect: BoundingRect | {start: number},
	rule: LintError.Rule,
	msg: string,
	severity?: LintError.Severity,
) => LintError;

const tableTags = new Set(['tr', 'td', 'th', 'caption']),
	tableTemplates = new Set(['Template:!!', 'Template:!-']);

/**
 * Check if the content is fostered
 * @param token
 */
export const isFostered = (token: AstNodes): 1 | 2 | false => {
	const first = token.childNodes.find(child => child.text().trim());
	if (
		!first
		|| first.type === 'text' && first.data.trim().startsWith('!')
		|| first.is<TranscludeToken>('magic-word') && first.name === '!'
		|| first.is<TranscludeToken>('template') && tableTemplates.has(first.name)
		|| first.is<HtmlToken>('html') && tableTags.has(first.name)
	) {
		return false;
	} else if (first.is<ArgToken>('arg')) {
		return first.length > 1 && isFostered(first.childNodes[1]!);
	} else if (first.is<TranscludeToken>('magic-word')) {
		try {
			const severity = first.getPossibleValues().map(isFostered);
			return severity.includes(2) ? 2 : severity.includes(1) && 1;
		} catch {}
	}
	return first.is<TranscludeToken>('template')
		|| first.is<TranscludeToken>('magic-word') && first.name === 'invoke'
		? 1
		: 2;
};

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
 * @param force 是否强制缓存
 */
export const cache = <T>(
	store: Cached<T> | undefined,
	compute: () => T,
	update: (value: Cached<T>) => void,
	force?: boolean,
): T => {
	if (store && (force || Parser.viewOnly && store[0] === Shadow.rev)) {
		return store[1];
	}
	const result = compute();
	update([Shadow.rev, result]);
	return result;
};

/**
 * 获取HTML属性值可选列表
 * @param tag 标签名
 * @param attribute 属性名
 */
export const provideValues = (tag: string, attribute: string): string[] => {
	if (tag === 'ol' && attribute === 'type') {
		return ['1', 'a', 'A', 'i', 'I'];
	} else if (tag === 'th' && attribute === 'scope') {
		return ['row', 'col', 'rowgroup', 'colgroup'];
	} else if (attribute === 'dir') {
		return ['ltr', 'rtl', 'auto'];
	}
	return attribute === 'aria-hidden' ? ['true', 'false'] : [];
};
