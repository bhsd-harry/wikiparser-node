import Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../index';

const errorSyntax = /https?:\/\/|\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
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
	/** @browser */
	override readonly type = 'text';
	declare name: undefined;
	/** @browser */
	data: string;

	/**
	 * @browser
	 * @param text 包含文本
	 */
	constructor(text: string) {
		super();
		this.data = text;
	}

	/**
	 * 输出字符串
	 * @browser
	 */
	override toString(): string {
		return this.data;
	}

	/**
	 * 可见部分
	 * @browser
	 */
	text(): string {
		return this.data;
	}

	/**
	 * Linter
	 * @browser
	 * @param start
	 */
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const {data, parentNode, nextSibling, previousSibling} = this,
			type = parentNode?.type,
			name = parentNode?.name,
			nextType = nextSibling?.type,
			previousType = previousSibling?.type,
			errorRegex
			= type === 'free-ext-link' || type === 'ext-link-url' || type === 'image-parameter' && name === 'link'
				? errorSyntaxUrl
				: errorSyntax,
			errors = [...data.matchAll(errorRegex)],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (errors.length > 0) {
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start)!,
				tags = new Set([ext, html, disallowedTags].flat(2));
			return (errors as unknown as {0: string, 1?: string, 2?: string, index: number}[])
				.map(({0: error, 1: prefix, 2: tag, index}) => {
					if (prefix) {
						index += prefix.length;
						error = error.slice(prefix.length);
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
								nextChar === char || type === 'ext-link-text'
								|| !data.slice(index + 1).trim() && nextType === 'free-ext-link'
							)
							|| char === ']' && (
								previousChar === char
								|| !data.slice(0, index).trim() && previousType === 'free-ext-link'
							)
							? 'error'
							: 'warning';
					return (char !== 'h' || index > 0) && (char !== '<' || tags.has(tag!.toLowerCase())) && {
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
	 * @browser
	 * @param text 新内容
	 */
	#setData(text: string): void {
		this.setAttribute('data', text);
	}

	/**
	 * 替换字符串
	 * @browser
	 * @param text 替换的字符串
	 */
	replaceData(text: string): void {
		this.#setData(text);
	}
}
