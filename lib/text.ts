import {
	zs,
	removeComment,
	escape,
} from '../util/string';
import {getEndPos} from '../util/lint';
import Parser from '../index';
import {AstNode} from './node';
import type {LintError, TokenTypes} from '../base';
import type {
	AttributeToken,
	ExtToken,
} from '../internal';

const sp = String.raw`[${zs}\t]*`,
	source =
		String.raw`<\s*(?:/\s*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*?\])|((?:^|\])[^[]*?)\]+|(?:rfc|pmid)(?=[-:：]?${
			sp
		}\d)|isbn(?=[-:：]?${sp}(?:\d(?:${sp}|-)){6})`;
const errorSyntax = new RegExp(String.raw`${source}|https?[:/]/+`, 'giu');
const errorSyntaxUrl = new RegExp(source, 'giu'),
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
	disallowedTags = new Set([
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
	]);
let wordRegex: RegExp;
try {
	// eslint-disable-next-line prefer-regex-literals
	wordRegex = new RegExp(String.raw`[\p{L}\p{N}_]`, 'u');
} catch /* istanbul ignore next */ {
	wordRegex = /\w/u;
}

/**
 * text node
 *
 * 文本节点
 */
export class AstText extends AstNode {
	declare readonly name: undefined;
	override readonly data: string = '';

	override get type(): 'text' {
		return 'text';
	}

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		this.data = text;
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
		/* istanbul ignore if */
		if (!parentNode) {
			throw new Error('An isolated text node cannot be linted!');
		}
		const {type, name, parentNode: grandparent} = parentNode;
		let isHtmlAttrVal = false;
		if (type === 'attr-value') {
			const {type: grandType, name: grandName, tag} = grandparent as AttributeToken;
			if (grandType !== 'ext-attr') {
				isHtmlAttrVal = true;
			} else if (
				tag === 'ref' && (grandName === 'name' || grandName === 'extends' || grandName === 'follow')
				|| grandName === 'group' && (tag === 'ref' || tag === 'references')
				|| tag === 'choose' && (grandName === 'before' || grandName === 'after')
			) {
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
			{ext, html, variants} = root.getAttribute('config'),
			{top, left} = root.posFromIndex(start)!,
			tags = new Set([
				'onlyinclude',
				'noinclude',
				'includeonly',
				...ext,
				...html[0],
				...html[1],
				...html[2],
				...disallowedTags,
			]);
		for (let mt = errorRegex.exec(data); mt; mt = errorRegex.exec(data)) {
			const [, tag, prefix] = mt;
			let {index, 0: error} = mt;
			if (prefix && prefix !== ']') {
				const {length} = prefix;
				index += length;
				error = error.slice(length);
			}
			error = error.toLowerCase();
			const [char] = error,
				magicLink = char === 'r' || char === 'p' || char === 'i';
			let {length} = error;
			if (
				char === '<' && !tags.has(tag!.toLowerCase())
				|| char === '[' && type === 'ext-link-text' && (
					/&(?:rbrack|#93|#x5[Dd];);/u.test(data.slice(index + 1))
					|| nextSibling?.is<ExtToken>('ext') && nextName === 'nowiki'
					&& nextSibling.innerText?.includes(']')
				)
				|| magicLink && (!parentNode.isPlain() || noLinkTypes.has(type))
			) {
				continue;
			} else if (char === ']' && (index || length > 1)) {
				errorRegex.lastIndex--;
			}
			let startIndex = start + index,
				endIndex = startIndex + length;
			const nextChar = rootStr[endIndex],
				previousChar = rootStr[startIndex - 1];
			let severity: LintError.Severity = length > 1 && !(
				char === '<' && (/^<\s/u.test(error) || !/[\s/>]/u.test(nextChar ?? '') || disallowedTags.has(tag!))
				|| isHtmlAttrVal && (char === '[' || char === ']')
				|| magicLink && type === 'parameter-value'
				|| /^(?:rfc|pmid|isbn)$/iu.test(error)
			)
			|| char === '{' && (nextChar === char || previousChar === '-' && variants.length > 0)
			|| char === '}' && (previousChar === char || nextChar === '-' && variants.length > 0)
			|| char === '[' && (
				type === 'ext-link-text' || nextType === 'free-ext-link' && !data.slice(index + 1).trim()
			)
			|| char === ']' && previousType === 'free-ext-link'
			&& !data.slice(0, index).includes(']')
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
			} else if (error === '{' && previousChar === '-' && severity === 'error') {
				severity = 'warning';
				if (index > 0) {
					error = '-{';
					index--;
					startIndex--;
					length = 2;
				}
			} else if (error === '}' && nextChar === '-' && severity === 'error') {
				severity = 'warning';
				if (index < data.length - 1) {
					error = '}-';
					endIndex++;
					length = 2;
				}
			}
			const pos = this.posFromIndex(index)!,
				{line: startLine, character: startCol} = getEndPos(top, left, pos.top + 1, pos.left),
				e: LintError = {
					rule: ruleMap[char!]!,
					message: Parser.msg(
						'lonely "$1"',
						magicLink || char === 'h' || error === '-{' || error === '}-' ? error : char,
					),
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
			} else if (char === 'h' && type !== 'link-text' && wordRegex.test(previousChar || '')) {
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
						: [{desc: 'uppercase', range: [startIndex, endIndex], text: error} satisfies LintError.Fix],
					...nextChar === ':' || nextChar === '：'
						? [{desc: 'whitespace', range: [endIndex, endIndex + 1], text: ' '} satisfies LintError.Fix]
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
		this.setAttribute('data', text);
	}

	/**
	 * Replace the text
	 *
	 * 替换字符串
	 * @param text new text / 替换的字符串
	 */
	replaceData(text: string): void {
		this.#setData(text);
	}

	/** @private */
	print(): string {
		return escape(this.data);
	}
}
