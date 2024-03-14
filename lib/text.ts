import {escape} from '../util/string';
import Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../base';
import type {AttributeToken, ExtToken} from '../internal';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<\s*(?:\/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*?\])|((?:^|\])[^[]*?)\]+|https?[:/]\/+/giu;
const source = '<\\s*(?:\\/\\s*)?([a-z]\\w*)' // 疑似标签
	+ '|'
	+ '\\{+|\\}+' // `{`、`}`
	+ '|'
	+ '\\[{2,}|\\[(?![^[]*?\\])' // `[`
	+ '|'
	+ '((?:^|\\])[^[]*?)\\]+', // `]`
	errorSyntax = new RegExp(`${source}|https?[:/]\\/+`, 'giu'),
	errorSyntaxUrl = new RegExp(source, 'giu'),
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
	},
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
			childNodes: {enumerable: false, configurable: false},
			type: {enumerable: false, writable: false},
			data: {
				value: text,
			},
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
	lint(start = this.getAbsoluteIndex(), errorRegex?: RegExp): LintError[] {
		const {data, parentNode, nextSibling, previousSibling} = this;
		if (!parentNode) {
			return [];
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
			{ext, html} = root.getAttribute('config'),
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
			const {0: char, length} = error;
			if (
				char === '<' && !tags.has(tag!.toLowerCase())
				|| char === '['
				&& type === 'ext-link-text'
				&& (
					/&(?:rbrack|#93|#x5[Dd];);/u.test(data.slice(index + 1))
					|| nextType === 'ext'
					&& nextName === 'nowiki'
					&& (nextSibling as ExtToken).innerText?.includes(']')
				)
			) {
				continue;
			} else if (char === ']' && (index || length > 1)) {
				errorRegex.lastIndex--;
			}
			const startIndex = start + index,
				endIndex = startIndex + length,
				rootStr = String(root),
				nextChar = rootStr[endIndex],
				previousChar = rootStr[startIndex - 1],
				severity = length > 1 && !(
					char === '<' && !/[\s/>]/u.test(nextChar ?? '')
					|| isHtmlAttrVal && (char === '[' || char === ']')
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
			const lines = data.slice(0, index).split('\n'),
				startLine = lines.length + top - 1,
				line = lines[lines.length - 1]!,
				startCol = lines.length === 1 ? left + line.length : line.length,
				e: LintError = {
					rule: ruleMap[char!]!,
					message: Parser.msg('lonely "$1"', char === 'h' ? error : char),
					severity,
					startIndex,
					endIndex,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
				};
			if (char === '<') {
				e.suggestions = [
					{
						desc: 'escape',
						range: [startIndex, startIndex + 1],
						text: '&lt;',
					},
				];
			} else if (
				char === 'h'
				&& !(type === 'ext-link-text' || type === 'link-text')
				&& /[\p{L}\d_]/u.test(previousChar || '')
			) {
				e.suggestions = [
					{
						desc: 'whitespace',
						range: [startIndex, startIndex],
						text: ' ',
					},
				];
			} else if (char === '[' && type === 'ext-link-text') {
				const i = parentNode.getAbsoluteIndex() + String(parentNode).length;
				e.suggestions = [
					{
						desc: 'escape',
						range: [i, i + 1],
						text: '&#93;',
					},
				];
			} else if (char === ']' && previousType === 'free-ext-link' && severity === 'error') {
				const i = start - String(previousSibling).length;
				e.fix = {
					range: [i, i],
					text: '[',
				};
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
		return escape(this.data);
	}
}
