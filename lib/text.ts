import Parser from '../index';
import {AstNode} from './node';
import type {LintError, Rule} from '../base';
import type {ExtToken} from '../internal';

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
	ruleMap: Record<string, Rule> = {
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
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const {data, parentNode, nextSibling, previousSibling} = this;
		const {NowikiToken}: typeof import('../src/nowiki') = require('../src/nowiki');
		const {type, name} = parentNode!,
			nowiki = name === 'nowiki' || name === 'pre';
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
				severity = length > 1 && (char !== '<' || !nowiki && /[\s/>]/u.test(nextChar ?? ''))
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
				startCol = lines.length === 1 ? left + line.length : line.length;
			errors.push({
				rule: ruleMap[char!]!,
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
		const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
		return this.data.replace(/[&<>]/gu, p => `&${entities[p as keyof typeof entities]};`);
	}
}
