import {rawurldecode} from '@bhsd/common';
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

export const generateForChild = /* #__PURE__ */ factory((child, start, line, col) => {
	const index = child.getRelativeIndex(),
		{top, left} = child.parentNode!.posFromIndex(index)!;
	return {
		startIndex: start + index,
		startLine: line + top,
		startCol: top ? left : col + left,
	};
});

export const generateForSelf =
	/* #__PURE__ */ factory((_, startIndex, startLine, startCol) => ({startIndex, startLine, startCol}));

/**
 * Quick fix
 * @param e LintError
 * @param desc description of the fix
 * @param text replacement text
 * @param offset offset to the start index
 */
export const fixBy = (e: LintError, desc: string, text: string, offset = 0): LintError.Fix =>
	({desc: Parser.msg(desc), range: [e.startIndex + offset, e.endIndex], text});

/**
 * Quick fix: insert the text
 * @param index the index to insert the text
 * @param desc description of the fix
 * @param text inserted text
 */
export const fixByInsert = (index: number, desc: string, text: string): LintError.Fix =>
	({desc: Parser.msg(desc), range: [index, index], text});

/**
 * Quick fix: remove the error
 * @param e LintError
 * @param offset offset to the start index
 * @param text replacement text
 */
export const fixByRemove = (e: LintError | number, offset = 0, text = ''): LintError.Fix =>
	typeof e === 'number'
		? {desc: Parser.msg('remove'), range: [e, e + offset], text}
		: fixBy(e, 'remove', text, offset);

/**
 * Quick fix: decode the link
 * @param e LintError
 * @param link the link to decode
 */
export const fixByDecode = (e: LintError, link: AstNodes): LintError.Fix =>
	fixBy(
		e,
		'decode',
		rawurldecode(link.text().replace(/%(?=21|3[ce]|5[bd]|7[b-d])/giu, '%25')),
	);

/**
 * Quick fix: close the syntax
 * @param index the index to insert the closing syntax
 * @param text the closing syntax text
 * @param offset offset to the start index
 */
export const fixByClose = (index: number, text: string, offset = 0): LintError.Fix =>
	({desc: Parser.msg('close'), range: [index + offset, index], text});

/**
 * Quick fix: open the syntax
 * @param index the index of the tag to open
 */
export const fixByOpen = (index: number): LintError.Fix =>
	({desc: Parser.msg('open'), range: [index + 1, index + 2], text: ''});

/**
 * Quick fix: comment out
 * @param e LintError
 * @param text the closing syntax text
 */
export const fixByComment = (e: LintError, text: string): LintError.Fix =>
	fixBy(e, 'comment', `<!--${text}-->`);

/**
 * Quick fix: convert to upper case
 * @param e LintError
 * @param text the closing syntax text
 */
export const fixByUpper = (e: LintError, text: string): LintError.Fix =>
	fixBy(e, 'uppercase', text.toUpperCase());

/**
 * Quick fix: insert space
 * @param index the index to insert the space
 * @param offset offset to the end index
 */
export const fixBySpace = (index: number, offset = 0): LintError.Fix =>
	({desc: Parser.msg('whitespace'), range: [index, index + offset], text: ' '});

/**
 * Quick fix: escape the character
 * @param index the index to escape the character
 * @param char the escaped character
 * @param offset offset to the end index
 */
export const fixByEscape = (index: number, char: string, offset = 1): LintError.Fix =>
	({desc: Parser.msg('escape'), range: [index, index + offset], text: char.repeat(offset)});

/**
 * Quick fix: escape the `|` character
 * @param index the index to escape the character
 * @param text the text to be replaced
 */
export const fixByPipe = (index: number, text: string): LintError.Fix => ({
	desc: Parser.msg('escape'),
	range: [index, index + text.length],
	text: text.replace(/\|/gu, '&#124;'),
});

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
