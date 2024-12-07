import {
	extUrlChar,
	extUrlCharFirst,
	removeComment,
	escape,

	/* NOT FOR BROWSER */

	sanitize,
} from '../util/string';
import Parser from '../index';
import {AstNode} from './node';
import type {LintError, TokenTypes} from '../base';
import type {
	AttributeToken,
	ExtToken,

	/* NOT FOR BROWSER */

	TranscludeToken,
} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {setChildNodes, Shadow} from '../util/debug';
import {font} from '../util/html';

/* NOT FOR BROWSER END */

/* eslint-disable @typescript-eslint/no-unused-expressions */
/<\s*(?:\/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*?\])|((?:^|\])[^[]*?)\]+|https?[:/]\/+/giu;
/^https?:\/\/(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])[^[\]<>"\t\n\p{Zs}]*\.(?:gif|png|jpg|jpeg)$/iu;
/* eslint-enable @typescript-eslint/no-unused-expressions */
const sp = String.raw`[\p{Zs}\t]*`,
	source =
		String.raw`<\s*(?:/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*?\])|((?:^|\])[^[]*?)\]+|(?:rfc|pmid)(?=[-:：]?${
			sp
		}\d)|isbn(?=[-:：]?${sp}(?:\d(?:${sp}|-)){6})`,
	errorSyntax = new RegExp(String.raw`${source}|https?[:/]/+`, 'giu'),
	errorSyntaxUrl = new RegExp(source, 'giu'),
	extImage = new RegExp(String.raw`^https?://${extUrlCharFirst}${extUrlChar}\.(?:gif|png|jpg|jpeg)$`, 'iu'),
	noLinkTypes = new Set<TokenTypes>(['attr-value', 'ext-link-text', 'link-text']),
	regexes = {
		'[': /[[\]]/u,
		'{': /[{}]/u,
		']': /[[\]](?=[^[\]]*$)/u,
		'}': /[{}](?=[^{}]*$)/u,
	},
	ruleMap: Record<string, LintError.Rule> = {
		'<': 'tag-like',
		'[': 'lonely-bracket',
		'{': 'lonely-bracket',
		']': 'lonely-bracket',
		'}': 'lonely-bracket',
		h: 'lonely-http',
		r: 'lonely-http',
		p: 'lonely-http',
		i: 'lonely-http',
	},
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
	declare readonly name: undefined;
	override readonly data: string = '';

	override get type(): 'text' {
		return 'text';
	}

	/* NOT FOR BROWSER */

	/** 文本长度 */
	get length(): number {
		return this.data.length;
	}

	set length(n) {
		if (n >= 0 && n < this.length) {
			this.replaceData(this.data.slice(0, n));
		}
	}

	/* NOT FOR BROWSER END */

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		Object.defineProperties(this, {
			childNodes: {enumerable: false, configurable: false},
			data: {
				value: text,

				/* NOT FOR BROWSER */

				writable: false,
			},
		});
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip && !this.parentNode?.getAttribute('built') ? removeComment(this.data) : this.data;
	}

	/** @private */
	text(): string {
		return this.data;
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), errorRegex?: RegExp | false): LintError[] {
		if (errorRegex === false) {
			return [];
		}
		const {data, parentNode, nextSibling, previousSibling} = this;
		if (!parentNode) {
			throw new Error('An isolated text node cannot be linted!');
		}
		const {type, name, parentNode: grandparent} = parentNode;
		let isHtmlAttrVal = false;
		if (type === 'attr-value') {
			const {type: grandType, name: grandName, tag} = grandparent as AttributeToken;
			if (grandType !== 'ext-attr') {
				isHtmlAttrVal = true;
			} else if (tag === 'choose' && (grandName === 'before' || grandName === 'after')) {
				return [];
			}
		}
		errorRegex ??= type === 'free-ext-link'
		|| type === 'ext-link-url'
		|| type === 'ext-link-text'
		|| type === 'image-parameter' && name === 'link'
		|| isHtmlAttrVal
			? errorSyntaxUrl
			: errorSyntax;
		if (data.search(errorRegex) === -1) {
			return [];
		}
		errorRegex.lastIndex = 0;
		const errors: LintError[] = [],
			nextType = nextSibling?.type,
			nextName = nextSibling?.name,
			previousType = previousSibling?.type,
			root = this.getRootNode(),
			rootStr = root.toString(),
			{ext, html} = root.getAttribute('config'),
			{top, left} = root.posFromIndex(start)!,
			tags = new Set(['onlyinclude', 'noinclude', 'includeonly', ext, html, disallowedTags].flat(2));
		for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
			const [, tag, prefix] = mt;
			let {index} = mt,
				error = mt[0].toLowerCase();
			if (prefix && prefix !== ']') {
				const {length} = prefix;
				index += length;
				error = error.slice(length);
			}
			const {0: char, length} = error,
				magicLink = char === 'r' || char === 'p' || char === 'i';
			if (
				char === '<' && !tags.has(tag!.toLowerCase())
				|| char === '[' && type === 'ext-link-text' && (
					/&(?:rbrack|#93|#x5[Dd];);/u.test(data.slice(index + 1))
					|| nextSibling?.is<ExtToken>('ext') && nextName === 'nowiki' && nextSibling.innerText?.includes(']')
				)
				|| char === 'h' && index === 0 && type === 'ext-link-text' && extImage.test(data)
				|| magicLink && (!parentNode.getAttribute('plain') || noLinkTypes.has(type))
			) {
				continue;
			} else if (char === ']' && (index || length > 1)) {
				errorRegex.lastIndex--;
			}
			const startIndex = start + index,
				endIndex = startIndex + length,
				nextChar = rootStr[endIndex],
				previousChar = rootStr[startIndex - 1],
				severity = length > 1 && !(
					char === '<' && !/[\s/>]/u.test(nextChar ?? '')
					|| isHtmlAttrVal && (char === '[' || char === ']')
					|| magicLink && type === 'parameter-value'
				)
				|| char === '{' && (nextChar === char || previousChar === '-')
				|| char === '}' && (previousChar === char || nextChar === '-')
				|| char === '[' && (
					nextChar === char
					|| type === 'ext-link-text'
					|| nextType === 'free-ext-link' && !data.slice(index + 1).trim()
				)
				|| char === ']' && (
					previousChar === char
					|| previousType === 'free-ext-link' && !data.slice(0, index).includes(']')
				)
					? 'error'
					: 'warning';
			const leftBracket = char === '{' || char === '[',
				rightBracket = char === ']' || char === '}';
			if (severity === 'warning' && (leftBracket || rightBracket)) {
				const regex = regexes[char],
					remains = leftBracket ? data.slice(index + 1) : data.slice(0, index);
				if (
					char === '{' && regex.exec(remains)?.[0] === '}'
					|| char === '}' && regex.exec(remains)?.[0] === '{'
				) {
					continue;
				} else if (!remains.includes(char)) {
					const sibling = leftBracket ? 'nextSibling' : 'previousSibling';
					let cur = this[sibling];
					while (cur && (cur.type !== 'text' || !regex.test(cur.data))) {
						cur = cur[sibling];
					}
					if (cur && regex.exec(cur.data)![0] !== char) {
						continue;
					}
				}
			}
			if (magicLink) {
				error = error.toUpperCase();
			}
			const lines = data.slice(0, index).split('\n'),
				startLine = lines.length + top - 1,
				line = lines[lines.length - 1]!,
				startCol = lines.length === 1 ? left + line.length : line.length,
				e: LintError = {
					rule: ruleMap[char!]!,
					message: Parser.msg('lonely "$1"', magicLink || char === 'h' ? error : char),
					severity,
					startIndex,
					endIndex,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
				};
			if (char === '<') {
				e.suggestions = [{desc: 'escape', range: [startIndex, startIndex + 1], text: '&lt;'}];
			} else if (
				char === 'h'
				&& !(type === 'ext-link-text' || type === 'link-text')
				&& /[\p{L}\d_]/u.test(previousChar || '')
			) {
				e.suggestions = [{desc: 'whitespace', range: [startIndex, startIndex], text: ' '}];
			} else if (char === '[' && type === 'ext-link-text') {
				const i = parentNode.getAbsoluteIndex() + parentNode.toString().length;
				e.suggestions = [{desc: 'escape', range: [i, i + 1], text: '&#93;'}];
			} else if (char === ']' && previousType === 'free-ext-link' && severity === 'error') {
				const i = start - previousSibling!.toString().length;
				e.fix = {range: [i, i], text: '[', desc: 'left bracket'};
			} else if (magicLink) {
				e.suggestions = [
					...mt[0] === error
						? []
						: [{desc: 'uppercase', range: [startIndex, endIndex], text: error} as LintError.Fix],
					...nextChar === ':' || nextChar === '：'
						? [{desc: 'whitespace', range: [endIndex, endIndex + 1], text: ' '} as LintError.Fix]
						: [],
				];
			}
			errors.push(e);
		}
		return errors;
	}

	/**
	 * 修改内容
	 * @param text 新内容
	 */
	#setData(text: string): void {
		/* NOT FOR BROWSER */

		const {data} = this,
			e = new Event('text', {bubbles: true});

		/* NOT FOR BROWSER END */

		this.setAttribute('data', text);

		/* NOT FOR BROWSER */

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

	/** @private */
	print(): string {
		return escape(this.data);
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
	deleteData(offset: number, count = Infinity): void {
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
	substringData(offset: number, count?: number): string {
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
			throw new RangeError(`Wrong offset to split: ${offset}`);
		}
		const {parentNode, data} = this;
		if (!parentNode) {
			throw new Error('The text node to be split has no parent node!');
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
			throw new RangeError('Exceeding the text length range!');
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
			this.after(Shadow.run(
				// @ts-expect-error abstract class
				(): TranscludeToken => new TranscludeToken('=', [], this.parentNode!.getAttribute('config')),
			));
			this.#setData(this.data.slice(0, i));
		}
	}

	/**
	 * 生成HTML
	 * @param nowrap 是否不换行
	 */
	toHtml(nowrap?: boolean): string {
		const {data} = this;
		return font(this, sanitize(nowrap ? data.replaceAll('\n', ' ') : data));
	}

	/** @private */
	removeBlankLines(): void {
		if (/\s$/u.test(this.data)) {
			const spaces: AstText[] = [],
				mt = /\n[^\S\n]*$/u.exec(this.data);
			let {nextSibling} = this,
				mt2: RegExpExecArray | null = null;
			while (
				nextSibling
				&& (nextSibling.type === 'comment' || nextSibling.type === 'category' || nextSibling.type === 'text')
			) {
				if (nextSibling.type === 'text') {
					mt2 = mt && /^[^\S\n]*(?=\n)/u.exec(nextSibling.data);
					if (mt2 || nextSibling.data.trim()) {
						break;
					} else {
						spaces.push(nextSibling);
					}
				} else if (mt && nextSibling.type === 'category') {
					const trimmed = this.data.trimEnd();
					if (this.data !== trimmed) {
						const {length} = trimmed;
						this.deleteData(length + this.data.slice(length).indexOf('\n'));
					}
					for (const space of spaces) {
						space.#setData('');
					}
					spaces.length = 0;
				}
				({nextSibling} = nextSibling);
			}
			if (mt2 || nextSibling?.type === 'table') {
				if (mt) {
					this.deleteData(mt.index + (mt2 ? 0 : 1));
					if (mt2) {
						(nextSibling as AstText).deleteData(0, mt2[0].length);
					}
				} else {
					this.#setData(this.data.trimEnd());
				}
				for (const space of spaces) {
					space.#setData('');
				}
			}
		}
	}

	/** @private */
	toHtmlInternal(opt?: Pick<HtmlOpt, 'nowrap'>): string {
		this.removeBlankLines();
		return this.toHtml(opt?.nowrap);
	}
}

classes['AstText'] = __filename;
