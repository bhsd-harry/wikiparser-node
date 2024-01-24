import {classes} from '../util/constants';
import {setChildNodes} from '../util/debug';
import * as Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../base';
import type {ExtToken} from '../internal';

const errorSyntax = /<\s*(?:\/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+|https?[:/]\/+/giu,
	errorSyntaxUrl = /<\s*(?:\/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*\])|((?:^|\])[^[]*?)\]+/giu,
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

/** 文本节点 */
export class AstText extends AstNode {
	override readonly type = 'text';
	declare readonly name: undefined;
	override readonly data: string = '';

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
			data: {
				value: text,
				writable: false,
			},
			childNodes: {enumerable: false, configurable: false},
			type: {enumerable: false, writable: false},
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
	 * @throws `Error` 孤立文本节点
	 */
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const {data, parentNode, nextSibling, previousSibling} = this;
		if (!parentNode) {
			throw new Error('无法对孤立文本节点进行语法分析！');
		}
		const {NowikiToken}: typeof import('../src/nowiki') = require('../src/nowiki');
		const {type, name} = parentNode,
			nowiki = name === 'nowiki' || name === 'pre',
			nextType = nextSibling?.type,
			nextName = nextSibling?.name,
			previousType = previousSibling?.type;
		let errorRegex;
		if (type === 'ext-inner' && (name === 'pre' || parentNode instanceof NowikiToken)) {
			errorRegex = new RegExp(
				`<\\s*(?:\\/\\s*)${nowiki ? '' : '?'}(${name})\\b`,
				'giu',
			);
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
		const errors: LintError[] = [],
			{ext, html} = this.getRootNode().getAttribute('config');
		if (data.search(errorRegex) !== -1) {
			errorRegex.lastIndex = 0;
			const root = this.getRootNode(),
				{top, left} = root.posFromIndex(start)!,
				tags = new Set(['onlyinclude', 'noinclude', 'includeonly', ext, html, disallowedTags].flat(2));
			for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
				const [, tag, prefix] = mt;
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
					severity = length > 1 && (char !== '<' || !nowiki && /[\s/>]/u.test(nextChar ?? ''))
					|| char === '{' && (nextChar === char || previousChar === '-')
					|| char === '}' && (previousChar === char || nextChar === '-')
					|| char === '[' && (
						nextChar === char
						|| type === 'ext-link-text'
						&& !/&(?:rbrack|#93|#x5[Dd];);/u.test(data.slice(index + 1))
						&& !(
							nextType === 'ext'
							&& nextName === 'nowiki'
							&& (nextSibling as ExtToken).innerText?.includes(']')
						)
						|| !data.slice(index + 1).trim() && nextType === 'free-ext-link'
					)
					|| char === ']' && (
						previousChar === char
						|| !data.slice(0, index).trim() && previousType === 'free-ext-link'
					)
						? 'error'
						: 'warning';
				if (char !== '<' || tags.has(tag!.toLowerCase())) {
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
	print(): string {
		const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
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
		const newText = new AstText(data.slice(offset));
		setChildNodes(parentNode, parentNode.childNodes.indexOf(this) + 1, 0, [newText]);
		this.setAttribute('data', data.slice(0, offset));
		return newText;
	}

	/** @private */
	override getRelativeIndex(j?: number): number {
		if (j === undefined) {
			return super.getRelativeIndex();
		} else if (j < 0 || j > this.length) {
			throw new RangeError('超出文本长度范围！');
		}
		return j;
	}

	/** 转义 `=` */
	escape(): void {
		const {TranscludeToken}: typeof import('../src/transclude') = require('../src/transclude');
		for (let i = this.data.lastIndexOf('='); i >= 0; i = this.data.lastIndexOf('=', i - 1)) {
			if (i < this.length - 1) {
				this.splitText(i + 1);
			}
			this.after(new TranscludeToken('=', [], this.parentNode!.getAttribute('config')));
			this.setAttribute('data', this.data.slice(0, i));
		}
	}
}

classes['AstText'] = __filename;
