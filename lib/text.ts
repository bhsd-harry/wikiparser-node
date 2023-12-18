import {classes} from '../util/constants';
import * as Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../base';

const errorSyntax = /https?:\/\/|\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
	errorSyntaxUrl = /\{+|\}+|\[{2,}|\[(?![^[]*\])|(?<=^|\])([^[]*?)\]+|\]{2,}|<\s*\/?([a-z]\w*)/giu,
	disallowedTags = [
		'html',
		'base',
		'head',
		'style',
		'title',
		'body',
		'menu',
		'a',
		'area',
		'audio',
		'img',
		'map',
		'track',
		'video',
		'embed',
		'iframe',
		'object',
		'picture',
		'source',
		'canvas',
		'script',
		'col',
		'colgroup',
		'tbody',
		'tfoot',
		'thead',
		'button',
		'datalist',
		'fieldset',
		'form',
		'input',
		'label',
		'legend',
		'meter',
		'optgroup',
		'option',
		'output',
		'progress',
		'select',
		'textarea',
		'details',
		'dialog',
		'slot',
		'template',
		'dir',
		'frame',
		'frameset',
		'marquee',
		'param',
		'xmp',
	];
const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

/** 文本节点 */
export class AstText extends AstNode {
	override readonly type = 'text';
	declare name: undefined;
	override data: string = '';

	/* NOT FOR BROWSER */

	/** 文本长度 */
	get length(): number {
		return this.data.length;
	}

	/* NOT FOR BROWSER END */

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		Object.defineProperties(this, {
			data: {value: text, writable: false},
			childNodes: {enumerable: false, configurable: false},
			type: {enumerable: false, writable: false, configurable: false},
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
	override lint(start = this.getAbsoluteIndex()): LintError[] {
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
			return (errors as (RegExpMatchArray & {index: number})[])
				.map(({0: error, 1: prefix, 2: tag, index}) => {
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
						end = char === '}' || char === ']' ? endIndex + 1 : startIndex + 49,
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
						excerpt: rootStr.slice(Math.max(0, end - 50), end),
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
		const {data} = this,
			e = new Event('text', {bubbles: true});
		this.setAttribute('data', text);
		if (data !== text) {
			this.dispatchEvent(e, {type: 'text', oldText: data});
		}
	}

	/**
	 * 替换字符串
	 * @param text 替换的字符串
	 */
	replaceData(text: string): void {
		this.#setData(text);
	}

	/** @override */
	override print(): string {
		return this.data.replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`);
	}

	/* NOT FOR BROWSER */

	/** 复制 */
	cloneNode(): AstText {
		return new AstText(this.data);
	}

	/**
	 * 在后方添加字符串
	 * @param text 添加的字符串
	 */
	appendData(text: string): void {
		this.#setData(this.data + text);
	}

	/**
	 * 删减字符串
	 * @param offset 起始位置
	 * @param count 删减字符数
	 */
	deleteData(offset: number, count: number): void {
		this.#setData(
			this.data.slice(0, offset) + (offset < 0 && offset + count >= 0 ? '' : this.data.slice(offset + count)),
		);
	}

	/**
	 * 插入字符串
	 * @param offset 插入位置
	 * @param text 待插入的字符串
	 */
	insertData(offset: number, text: string): void {
		this.#setData(this.data.slice(0, offset) + text + this.data.slice(offset));
	}

	/**
	 * 提取子串
	 * @param offset 起始位置
	 * @param count 字符数
	 */
	substringData(offset: number, count: number): string {
		return this.data.substr(offset, count);
	}

	/**
	 * 将文本子节点分裂为两部分
	 * @param offset 分裂位置
	 * @throws `RangeError` 错误的断开位置
	 * @throws `Error` 没有父节点
	 */
	splitText(offset: number): AstText {
		if (offset > this.length || offset < -this.length) {
			throw new RangeError(`错误的断开位置：${offset}`);
		}
		const {parentNode, data} = this;
		if (!parentNode) {
			throw new Error('待分裂的文本节点没有父节点！');
		}
		const newText = new AstText(data.slice(offset)),
			childNodes = [...parentNode.childNodes];
		this.setAttribute('data', data.slice(0, offset));
		childNodes.splice(childNodes.indexOf(this) + 1, 0, newText);
		newText.setAttribute('parentNode', parentNode);
		parentNode.setAttribute('childNodes', childNodes);
		return newText;
	}

	/**
	 * @override
	 * @param j 字符位置
	 * @throws `RangeError` 超出文本长度范围
	 */
	override getRelativeIndex(j?: number): number {
		if (j === undefined) {
			return super.getRelativeIndex();
		} else if (j < 0 || j > this.length) {
			throw new RangeError(`超出文本长度范围！`);
		}
		return j;
	}
}

classes['AstText'] = __filename;
