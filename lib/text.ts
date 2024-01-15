import * as Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../base';

const errorSyntax = /<\s*\/?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|https?[:/]\/+/giu,
	errorSyntaxUrl = /<\s*\/?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}/giu,
	disallowedTags = [
		'html',
		'head',
		'style',
		'title',
		'body',
		'a',
		'audio',
		'img',
		'video',
		'embed',
		'iframe',
		'object',
		'canvas',
		'script',
		'col',
		'colgroup',
		'tbody',
		'tfoot',
		'thead',
		'button',
		'input',
		'label',
		'option',
		'select',
		'textarea',
	];

/** 文本节点 */
export class AstText extends AstNode {
	override readonly type = 'text';
	declare readonly name: undefined;
	override readonly data: string = '';

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		Object.defineProperties(this, {
			data: {value: text, writable: false},
		});
	}

	/** @private */
	override toString(): string {
		return this.data;
	}

	/** 可见部分 */
	text(): string {
		return this.data;
	}

	/**
	 * @override
	 * @param start
	 */
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const {data, parentNode, nextSibling, previousSibling} = this;
		const {NowikiToken}: typeof import('../src/nowiki') = require('../src/nowiki');
		const {type, name} = parentNode,
			nextType = nextSibling?.type,
			previousType = previousSibling?.type;
		let errorRegex;
		if (type === 'ext-inner' && (name === 'pre' || parentNode instanceof NowikiToken)) {
			errorRegex = new RegExp(`<\\s*\\/?(${name})\\b`, 'giu');
		} else if (
			type === 'free-ext-link'
				|| type === 'ext-link-url'
				|| type === 'image-parameter' && name === 'link'
				|| type === 'attr-value'
		) {
			errorRegex = errorSyntaxUrl;
		} else {
			errorRegex = errorSyntax;
		}
		const errors = [...data.matchAll(errorRegex)],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (errors.length > 0) {
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start)!,
				tags = new Set(['onlyinclude', 'noinclude', 'includeonly', ext, html, disallowedTags].flat(2));
			return (errors as (RegExpMatchArray & {index: number})[])
				.map(({0: error, 1: tag, 2: prefix, index}) => {
					if (prefix) {
						const {length} = prefix;
						index += length;
						error = error.slice(length);
					}
					const startIndex = start + index,
						lines = data.slice(0, index).split('\n'),
						startLine = lines.length + top - 1,
						line = lines.at(-1)!,
						startCol = lines.length === 1 ? left + line.length : line.length,
						{0: char, length} = error,
						endIndex = startIndex + length,
						rootStr = String(root),
						nextChar = rootStr[endIndex],
						previousChar = rootStr[startIndex - 1],
						severity = length > 1 && (char !== '<' || /[\s/>]/u.test(nextChar ?? ''))
						|| char === '{' && (nextChar === char || previousChar === '-')
						|| char === '}' && (previousChar === char || nextChar === '-')
						|| char === '[' && (
							nextChar === char
							|| type === 'ext-link-text'
							|| !data.slice(index + 1).trim() && nextType === 'free-ext-link'
						)
						|| char === ']' && (
							previousChar === char
							|| !data.slice(0, index).trim() && previousType === 'free-ext-link'
						)
							? 'error'
							: 'warning';
					return (char !== '<' || tags.has(tag!.toLowerCase())) && {
						message: Parser.msg('lonely "$1"', char === 'h' ? error : char),
						severity,
						startIndex,
						endIndex,
						startLine,
						endLine: startLine,
						startCol,
						endCol: startCol + length,
					};
				}).filter(Boolean) as LintError[];
		}
		return [];
	}

	/**
	 * 修改内容
	 * @param text 新内容
	 */
	#setData(text: string): void {
		this.setAttribute('data', text);
	}

	/**
	 * 替换字符串
	 * @param text 替换的字符串
	 */
	replaceData(text: string): void {
		this.#setData(text);
	}

	/** @override */
	print(): string {
		const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
		return this.data.replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`);
	}
}
