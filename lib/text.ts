import Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../base';

const errorSyntax = /https?:\/\/|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|<\s*\/?([a-z]\w*)/giu,
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
const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

/** 文本节点 */
export class AstText extends AstNode {
	override readonly type = 'text';
	declare name: undefined;
	override data: string = '';

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		this.data = text;
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
		const {type, name} = parentNode!,
			nextType = nextSibling?.type,
			previousType = previousSibling?.type,
			errorRegex
			= type === 'free-ext-link' || type === 'ext-link-url' || type === 'image-parameter' && name === 'link'
				? errorSyntaxUrl
				: errorSyntax,
			errors: LintError[] = [],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (data.search(errorRegex) !== -1) {
			errorRegex.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start)!,
				tags = new Set([ext, html, disallowedTags].flat(2));
			for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
				const [, prefix, tag] = mt;
				let {0: error, index} = mt;
				if (prefix && prefix !== ']') {
					const {length} = prefix;
					index += length;
					error = error.slice(length);
				}
				const startIndex = start + index,
					lines = data.slice(0, index).split('\n'),
					startLine = lines.length + top - 1,
					line = lines[lines.length - 1]!,
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
				if ((char !== 'h' || index > 0) && (char !== '<' || tags.has(tag!.toLowerCase()))) {
					errors.push({
						message: Parser.msg('lonely "$1"', char === 'h' ? error : char),
						severity,
						startIndex,
						endIndex,
						startLine,
						endLine: startLine,
						startCol,
						endCol: startCol + length,
					});
				}
			}
			return errors;
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
		return this.data.replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`);
	}
}
