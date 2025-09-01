import {generateForSelf, cache, fixByRemove, fixByClose, fixByOpen} from '../util/lint';
import {Shadow} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import {attributesParent} from '../mixin/attributesParent';
import Parser from '../index';
import {Token} from './index';
import type {Cached} from '../util/lint';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {AttributesToken, TranscludeToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {getId} from '../util/html';
import {fixedToken} from '../mixin/fixed';
import {cached} from '../mixin/cached';
import type {AstRange} from '../lib/range';

/* NOT FOR BROWSER END */

export interface HtmlToken extends AttributesParentBase {}

const magicWords = new Set<string | undefined>(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']),
	formattingTags = new Set([
		'b',
		'big',
		'center',
		'cite',
		'code',
		'del',
		'dfn',
		'em',
		'font',
		'i',
		'ins',
		'kbd',
		'mark',
		'pre',
		'q',
		's',
		'samp',
		'small',
		'strike',
		'strong',
		'sub',
		'sup',
		'tt',
		'u',
		'var',
	]),
	obsoleteTags = new Set(['strike', 'big', 'center', 'font', 'tt']);

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@fixedToken
@attributesParent()
export abstract class HtmlToken extends Token {
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AttributesToken];
	abstract override get firstElementChild(): AttributesToken;
	abstract override get lastElementChild(): AttributesToken;

	/* NOT FOR BROWSER END */

	override get type(): 'html' {
		return 'html';
	}

	/** whether to be self-closing / 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/* NOT FOR BROWSER */

	/** @throws `Error` 自封闭标签或空标签 */
	set closing(value) {
		if (!value) {
			this.#closing = false;
			return;
		} else if (this.selfClosing) {
			throw new Error('This is a self-closing tag!');
		}
		const {html: [,, tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error('This is a void tag!');
		}
		this.#closing = true;
	}

	/** @throws `Error` 闭合标签或无效自封闭标签 */
	set selfClosing(value) { // eslint-disable-line grouped-accessor-pairs
		if (!value) {
			this.#selfClosing = false;
			return;
		} else if (this.closing) {
			throw new Error('This is a closing tag!');
		}
		const {html: [tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error(`<${this.name}> tag cannot be self-closing!`);
		}
		this.#selfClosing = true;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 * @param selfClosing 是否自封闭
	 */
	constructor(
		name: string,
		attr: AttributesToken,
		closing: boolean,
		selfClosing: boolean,
		config?: Config,
		accum?: Token[],
	) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString(skip)}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override text(): string {
		const {
				closing,

				/* NOT FOR BROWSER */

				name,
			} = this,
			{html: [,, voidTags]} = this.getAttribute('config'),
			tag = this.#tag + (closing ? '' : super.text());

		/* NOT FOR BROWSER */

		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}/>`;
		}

		/* NOT FOR BROWSER END */

		return `<${closing ? '/' : ''}${tag}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* PRINT ONLY */

		if (key === 'invalid') {
			return (this.inTableAttrs() === 2) as TokenAttribute<T>;
		}

		/* PRINT ONLY END */

		return key === 'padding'
			? this.#tag.length + (this.closing ? 2 : 1) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{name, parentNode, closing, selfClosing} = this,
				rect = new BoundingRect(this, start),
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				severity = this.inTableAttrs();
			let rule: LintError.Rule = 'h1',
				s = lintConfig.getSeverity(rule, 'html');
			if (s && name === 'h1' && !closing) {
				const e = generateForSelf(this, rect, rule, '<h1>', s);
				if (computeEditInfo) {
					e.suggestions = [{desc: 'h2', range: [start + 2, start + 3], text: '2'}];
				}
				errors.push(e);
			}
			rule = 'parsing-order';
			s = severity && lintConfig.getSeverity(rule, severity === 2 ? 'html' : 'templateInTable');
			if (s) {
				const e = generateForSelf(this, rect, rule, 'html-in-table', s);
				if (computeEditInfo && severity === 2) {
					e.suggestions = [fixByRemove(e)];
				}
				errors.push(e);
			}
			rule = 'obsolete-tag';
			s = lintConfig.getSeverity(rule, name);
			if (s && obsoleteTags.has(name)) {
				errors.push(generateForSelf(this, rect, rule, 'obsolete-tag', s));
			}
			rule = 'bold-header';
			s = lintConfig.getSeverity(rule, name);
			if (
				s && (name === 'b' || name === 'strong')
				&& this.closest('heading-title,ext')?.type === 'heading-title'
			) {
				const e = generateForSelf(this, rect, rule, 'bold-in-header', s);
				if (computeEditInfo) {
					e.suggestions = [fixByRemove(e)];
				}
				errors.push(e);
			}
			const {html: [, flexibleTags, voidTags]} = this.getAttribute('config'),
				isVoid = voidTags.includes(name),
				isFlexible = flexibleTags.includes(name),
				isNormal = !isVoid && !isFlexible;
			rule = 'unmatched-tag';
			if (closing && (selfClosing || isVoid) || selfClosing && isNormal) {
				s = lintConfig.getSeverity(rule, closing ? 'both' : 'selfClosing');
				if (s) {
					const e = generateForSelf(
						this,
						rect,
						rule,
						closing ? 'closing-and-self-closing' : 'invalid-self-closing',
						s,
					);
					if (computeEditInfo || fix) {
						const open = fixByOpen(start),
							noSelfClosing: LintError.Fix = {
								desc: Parser.msg('no-self-closing'),
								range: [e.endIndex - 2, e.endIndex - 1],
								text: '',
							};
						if (isFlexible) {
							if (computeEditInfo) {
								e.suggestions = [open, noSelfClosing];
							}
						} else if (closing) {
							e.fix = isVoid ? open : noSelfClosing;
						} else if (computeEditInfo) {
							e.suggestions = [
								noSelfClosing,
								fixByClose(e.endIndex, `></${name}>`, -2),
							];
						}
					}
					errors.push(e);
				}
			} else if (!this.findMatchingTag()) {
				const error = generateForSelf(this, rect, rule, closing ? 'unmatched-closing' : 'unclosed-tag'),
					ancestor = this.closest<TranscludeToken>('magic-word');
				if (ancestor && magicWords.has(ancestor.name)) {
					s = lintConfig.getSeverity(rule, 'conditional');
				} else if (closing) {
					s = lintConfig.getSeverity(rule, 'closing');
					error.suggestions = [fixByRemove(error)];
				} else {
					s = lintConfig.getSeverity(rule, 'opening');
					const childNodes = parentNode?.childNodes;
					if (formattingTags.has(name)) {
						if (
							childNodes?.slice(0, childNodes.indexOf(this)).some(
								tag => tag.type === 'html' && tag.name === name && !(tag as this).findMatchingTag(),
							)
						) {
							error.suggestions = [fixByClose(start + 1, '/')];
						}
						if (this.closest('heading-title')) {
							error.rule = 'format-leakage';
							s = lintConfig.getSeverity('format-leakage', name);
						}
					}
				}
				if (s) {
					error.severity = s;
					errors.push(error);
				}
			}
			return errors;
		}
	}

	/**
	 * Find the matching tag
	 *
	 * 搜索匹配的标签
	 */
	findMatchingTag(): this | undefined {
		return cache<this | undefined>(
			this.#match,
			() => {
				const {name, parentNode, closing, selfClosing} = this,
					{html: [, flexibleTags, voidTags]} = this.getAttribute('config'),
					isVoid = voidTags.includes(name),
					isFlexible = flexibleTags.includes(name);
				if (isVoid || isFlexible && selfClosing) { // 自封闭标签
					return this;
				} else if (!parentNode) {
					return undefined;
				}
				const {childNodes} = parentNode,
					i = childNodes.indexOf(this),
					siblings = closing ? childNodes.slice(0, i).reverse() : childNodes.slice(i + 1),
					stack = [this],
					{rev} = Shadow;
				for (const token of siblings) {
					if (!token.is<this>('html') || token.name !== name || isFlexible && token.#selfClosing) {
						continue;
					} else if (token.#closing === closing) {
						stack.push(token);
					} else {
						const top = stack.pop()!;
						if (top === this) {
							return token;
						}
						if (Parser.viewOnly) {
							top.#match = [rev, token];
							token.#match = [rev, top];
						}
					}
				}
				if (Parser.viewOnly) {
					for (const token of stack) {
						token.#match = [rev, undefined];
					}
				}
				return undefined;
			},
			value => {
				this.#match = value;
				if (value[1] && value[1] !== this) {
					value[1].#match = [Shadow.rev, this];
				}
			},
		);
	}

	/** @private */
	override print(): string {
		return super.print({
			pre: `&lt;${this.closing ? '/' : ''}${this.#tag}`,
			post: `${this.#selfClosing ? '/' : ''}&gt;`,
		});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		LSP: { // eslint-disable-line no-unused-labels
			Object.assign(json, {closing: this.closing, selfClosing: this.#selfClosing});
			return json;
		}
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [attr] = this.cloneChildNodes() as [AttributesToken],
			config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run((): this => new HtmlToken(this.#tag, attr, this.closing, this.selfClosing, config));
	}

	/**
	 * Change the tag name
	 *
	 * 更换标签名
	 * @param tag tag name / 标签名
	 * @throws `RangeError` 非法的HTML标签
	 */
	replaceTag(tag: string): void {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.some(tags => tags.includes(name))) {
			throw new RangeError(`Invalid HTML tag: ${tag}`);
		}
		this.setAttribute('name', name);
		this.#tag = tag;
	}

	/**
	 * Fix the invalid self-closing tag
	 *
	 * 修复无效自封闭标签
	 * @throws `Error` 无法修复无效自封闭标签
	 */
	fix(): void {
		const {html: [normalTags]} = this.getAttribute('config'),
			{parentNode, name: tagName, firstChild, selfClosing} = this;
		if (!parentNode || !selfClosing || !normalTags.includes(tagName)) {
			return;
		} else if (firstChild.text().trim()) {
			this.#selfClosing = false;
			this.after(
				Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config'))
					.firstChild!,
			);
			return;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			prevSiblings = childNodes.slice(0, i)
				.filter((child): child is this => child.is<this>('html') && child.name === tagName),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			throw new Error(
				`Cannot fix invalid self-closing tag: The previous ${imbalance} closing tag(s) are unmatched`,
			);
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {closing, name} = this,
			{html: [, selfClosingTags, voidTags]} = this.getAttribute('config'),
			tag = name + (closing ? '' : super.toHtmlInternal());
		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}>`;
		}
		const result = `<${closing ? '/' : ''}${tag}>${
			this.#selfClosing && !closing && selfClosingTags.includes(name) ? `</${name}>` : ''
		}`;
		if (/^h\d$/u.test(name) && (this.closing || !this.id)) {
			const matched = this.findMatchingTag();
			if (matched) {
				if (closing) {
					return result + (matched.id ? '' : '</div>');
				}
				const range = this.createRange();
				range.setStartAfter(this);
				range.setEndBefore(matched);
				return `<div class="mw-heading mw-heading${name.slice(-1)}">${
					result.slice(0, -1)
				} id="${getId(range.cloneContents())}">`;
			}
		}
		return result;
	}

	/**
	 * Get the range of the HTML tag pair
	 *
	 * 获取HTML标签对的范围
	 * @since v1.23.0
	 */
	getRange(): AstRange | undefined {
		const {closing, selfClosing, name} = this,
			{html: [, selfClosingTags, voidTags]} = this.getAttribute('config');
		if (voidTags.includes(name) || selfClosing && selfClosingTags.includes(name)) {
			return undefined;
		}
		const matched = this.findMatchingTag();
		if (!matched) {
			return undefined;
		}
		const range = this.createRange();
		range.setStartAfter(closing ? matched : this);
		range.setEndBefore(closing ? this : matched);
		return range;
	}
}

classes['HtmlToken'] = __filename;
