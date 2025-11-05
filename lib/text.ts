import {
	zs,
	removeComment,
} from '../util/string';
import {getEndPos, fixByUpper, fixBySpace, fixByEscape, fixByInsert} from '../util/lint';
import {setChildNodes, Shadow} from '../util/debug';
import Parser from '../index';
import {AstNode} from './node';
import type {LintError, TokenTypes} from '../base';
import type {
	AttributeToken,
	ExtToken,
	TranscludeToken,
} from '../internal';

const sp = /* #__PURE__ */ (() => String.raw`[${zs}\t]*`)(),
	source =/* #__PURE__ */ (
		() => String.raw`<(?:/[^\S\n]*)?([a-z]\w*)|\{+|\}+|\[{2,}|\[(?![^[]*?\])|((?:^|\])[^[]*?)\]+`
	)();
const errorSyntax = /* #__PURE__ */ (() => new RegExp(
	String.raw`${source}|https?[:/]/+|(?:rfc|pmid)(?=[-:：]?${sp}\d)|isbn(?=[-:：]?${sp}(?:\d(?:${sp}|-)){6})`,
	'giu',
))();
const errorSyntaxUrl = /* #__PURE__ */ new RegExp(source, 'giu'),
	noLinkTypes = new Set<TokenTypes>(['attr-value', 'ext-link-text', 'link-text']),
	regexes = {
		'[': /[[\]]/u,
		'{': /[{}]/u,
		']': /[[\]](?=[^[\]]*$)/u,
		'}': /[{}](?=[^{}]*$)/u,
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
const wordRegex = /* #__PURE__ */ ((): RegExp => {
	try {
		// eslint-disable-next-line prefer-regex-literals
		return new RegExp(String.raw`[\p{L}\p{N}_]`, 'u');
	} catch /* istanbul ignore next */ {
		return /\w/u;
	}
})();

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
		LINT: {
			if (errorRegex === false) {
				return [];
			}
			const {data, parentNode, nextSibling, previousSibling} = this;
			/* istanbul ignore if */
			if (!parentNode) {
				throw new Error('An isolated text node cannot be linted!');
			}
			const {type, parentNode: grandparent} = parentNode;
			if (type === 'attr-value') {
				const {name: grandName, tag} = grandparent as AttributeToken;
				if (
					tag === 'ref' && (grandName === 'name' || grandName === 'follow')
					|| grandName === 'group' && (tag === 'ref' || tag === 'references')
					|| tag === 'choose' && (grandName === 'before' || grandName === 'after')
				) {
					return [];
				}
			}
			errorRegex ??= parentNode.isPlain() && !noLinkTypes.has(type) ? errorSyntax : errorSyntaxUrl;
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
				{lintConfig} = Parser,
				tagLike = lintConfig.rules['tag-like']!,
				specified = typeof tagLike === 'object' && tagLike[1]
					? new Set(Object.keys(tagLike[1]).filter(tag => tag !== 'invalid' && tag !== 'disallowed'))
					: new Set(),
				tags = new Set([
					'onlyinclude',
					'noinclude',
					'includeonly',
					...ext,
					...html[0],
					...html[1],
					...html[2],
					...specified,
					...lintConfig.getSeverity('tag-like', 'disallowed') ? disallowedTags : [],
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
					magicLink = char === 'r' || char === 'p' || char === 'i',
					lbrace = char === '{',
					rbrace = char === '}',
					lbrack = char === '[',
					rbrack = char === ']';
				let {length} = error;
				if (
					char === '<' && !tags.has(tag!.toLowerCase())
					|| lbrack && type === 'ext-link-text' && (
						/&(?:rbrack|#93|#x5[Dd];);/u.test(data.slice(index + 1))
						|| nextSibling?.is<ExtToken>('ext') && nextName === 'nowiki'
						&& nextSibling.innerText?.includes(']')
					)
				) {
					continue;
				} else if (rbrack && (index || length > 1)) {
					errorRegex.lastIndex--;
				}

				// Rule & Severity
				let startIndex = start + index,
					endIndex = startIndex + length,
					rule: LintError.Rule | undefined,
					severity: LintError.Severity | false;
				const nextChar = rootStr[endIndex],
					previousChar = rootStr[startIndex - 1],
					leftBracket = lbrace || lbrack,
					lConverter = lbrace && previousChar === '-' && variants.length > 0,
					rConverter = rbrace && nextChar === '-' && variants.length > 0,
					brokenExtLink = lbrack && nextType === 'free-ext-link' && !data.slice(index + 1).trim()
						|| rbrack && previousType === 'free-ext-link'
						&& !data.slice(0, index).includes(']');
				if (magicLink) {
					rule = 'lonely-http';
					error = error.toUpperCase();
					severity = lintConfig.getSeverity(rule, error);
				} else if (char === '<') {
					rule = 'tag-like';
					let key: string | undefined;
					if (/^<\/?\s/u.test(error) || !/[\s/>]/u.test(nextChar ?? '')) {
						key = 'invalid';
					} else if (specified.has(tag)) {
						key = tag;
					} else if (disallowedTags.has(tag!) && !ext.includes(tag!)) {
						key = 'disallowed';
					}
					severity = lintConfig.getSeverity(rule, key);
				} else if (lConverter || rConverter) {
					rule = 'lonely-bracket';
					severity = lintConfig.getSeverity(rule, 'converter');
					if (lConverter && index > 0) {
						error = '-{';
						index--;
						startIndex--;
						length = 2;
					} else if (rConverter && index < data.length - 1) {
						error = '}-';
						endIndex++;
						length = 2;
					}
				} else if (brokenExtLink) {
					rule = 'lonely-bracket';
					severity = lintConfig.getSeverity(rule, 'extLink');
				} else if (leftBracket || rbrace || rbrack) {
					rule = 'lonely-bracket';
					if (length > 1 || lbrace && nextChar === char || rbrace && previousChar === char) {
						severity = lintConfig.getSeverity(rule, 'double');
					} else {
						if (!lbrack || type !== 'ext-link-text') {
							const regex = regexes[char],
								remains = leftBracket ? data.slice(index + 1) : data.slice(0, index);
							if (
								lbrace && regex.exec(remains)?.[0] === '}'
								|| rbrace && regex.exec(remains)?.[0] === '{'
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
						severity = lintConfig.getSeverity(rule, 'single');
					}
				} else {
					rule = 'lonely-http';
					severity = lintConfig.getSeverity(rule);
				}
				if (!severity) {
					continue;
				}

				// LintError
				const pos = this.posFromIndex(index)!,
					{line: startLine, character: startCol} = getEndPos(top, left, pos.top + 1, pos.left),
					e: LintError = {
						rule,
						message: Parser.msg(
							'lonely',
							magicLink || char === 'h' || lConverter || rConverter ? error : char,
						),
						severity,
						startIndex,
						endIndex,
						startLine,
						endLine: startLine,
						startCol,
						endCol: startCol + length,
					};

				// Suggestions
				if (lintConfig.computeEditInfo) {
					if (char === '<') {
						e.suggestions = [fixByEscape(startIndex, '&lt;')];
					} else if (char === 'h' && type !== 'link-text' && wordRegex.test(previousChar || '')) {
						e.suggestions = [fixBySpace(startIndex)];
					} else if (lbrack && type === 'ext-link-text') {
						const i = parentNode.getAbsoluteIndex() + parentNode.toString().length;
						e.suggestions = [fixByEscape(i, '&#93;')];
					} else if (rbrack && brokenExtLink) {
						const i = start - previousSibling!.toString().length;
						e.suggestions = [fixByInsert(i, 'left-bracket', '[')];
					} else if (magicLink) {
						e.suggestions = [
							...mt[0] === error
								? []
								: [fixByUpper(e, error)],
							...nextChar === ':' || nextChar === '：'
								? [fixBySpace(endIndex, 1)]
								: [],
						];
					}
				}

				errors.push(e);
			}
			return errors;
		}
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

	/**
	 * Split the text node into two parts
	 *
	 * 将文本子节点分裂为两部分
	 * @param offset position to be splitted at / 分裂位置
	 * @throws `RangeError` 错误的断开位置
	 * @throws `Error` 没有父节点
	 */
	splitText(offset: number): AstText {
		LSP: {
			const {parentNode, data} = this;
			/* istanbul ignore if */
			if (!parentNode) {
				throw new Error('The text node to be split has no parent node!');
			}
			const newText = new AstText(data.slice(offset));
			setChildNodes(parentNode, parentNode.childNodes.indexOf(this) + 1, 0, [newText]);
			this.setAttribute('data', data.slice(0, offset));
			return newText;
		}
	}

	/**
	 * Escape `=` and `|`
	 *
	 * 转义 `=` 和 `|`
	 * @since v1.1.4
	 * @throws `Error` 没有父节点
	 */
	escape(): void {
		LSP: {
			const {parentNode} = this;
			/* istanbul ignore if */
			if (!parentNode) {
				throw new Error('The text node to be escaped has no parent node!');
			}
			const {TranscludeToken}: typeof import('../src/transclude') = require('../src/transclude');
			const config = parentNode.getAttribute('config'),
				index = parentNode.childNodes.indexOf(this) + 1;

			/**
			 * Get the last index of `=` or `|`
			 * @param j start position from the end
			 */
			const lastIndexOf = (j?: number): number =>
				Math.max(this.data.lastIndexOf('=', j), this.data.lastIndexOf('|', j));
			let i = lastIndexOf();
			const callback = /** @ignore */ (): TranscludeToken =>
				// @ts-expect-error abstract class
				new TranscludeToken(this.data[i] === '=' ? '=' : '!', [], config);
			for (; i >= 0; i = lastIndexOf(i - 1)) {
				if (i < this.data.length - 1) {
					this.splitText(i + 1);
				}
				parentNode.insertAt(Shadow.run(callback), index);
				this.#setData(this.data.slice(0, i));
			}
		}
	}
}
