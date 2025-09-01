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
			} = this,
			tag = this.#tag + (closing ? '' : super.text());
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
}
