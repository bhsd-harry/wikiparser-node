import {cache} from '../../util/lint';
import {Shadow} from '../../util/debug';
import Parser from '../../index';
import {Token} from '../index';
import type {Cached} from '../../util/lint';
import type {Config} from '../../base';
import type {AttributesToken, SyntaxToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';
import type {AstRange} from '../../lib/range';

/* NOT FOR BROWSER END */

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@fixedToken
export abstract class TagToken extends Token {
	#closing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [AttributesToken | SyntaxToken];
	abstract override get firstChild(): AttributesToken | SyntaxToken;
	abstract override get lastChild(): AttributesToken | SyntaxToken;
	abstract override get type(): 'html' | 'tvar';
	abstract get selfClosing(): boolean;

	/* NOT FOR BROWSER */

	abstract override get children(): [AttributesToken | SyntaxToken];
	abstract override get firstElementChild(): AttributesToken | SyntaxToken;
	abstract override get lastElementChild(): AttributesToken | SyntaxToken;

	/* NOT FOR BROWSER END */

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/* NOT FOR BROWSER */

	set closing(value) {
		this.#closing = Boolean(value);
	}

	/** @private */
	get tag(): string {
		return this.#tag;
	}

	/** @private */
	set tag(value: string) {
		this.#tag = value;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: AttributesToken | SyntaxToken, closing: boolean, config?: Config, accum?: Token[]) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.#closing = closing;
		this.#tag = tag;
	}

	/** @private */
	override toString(skip?: boolean, separator = ''): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString(skip)}${separator}>`;
	}

	/** @private */
	override text(separator = ''): string {
		const {closing} = this;
		return `<${closing && !separator ? '/' : ''}${this.#tag}${closing ? '' : super.text()}${separator}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? this.#tag.length + (this.#closing ? 2 : 1) as TokenAttribute<T>
			: super.getAttribute(key);
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
				const {type, name, parentNode, closing, selfClosing} = this;
				let isVoid = false,
					isFlexible = false;
				if (type === 'html') {
					const {html: [, flexibleTags, voidTags]} = this.getAttribute('config');
					isVoid = voidTags.includes(name!);
					isFlexible = flexibleTags.includes(name!);
				}
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
					if (!token.is<this>(type) || token.name !== name || isFlexible && token.selfClosing) {
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
	override print(opt?: PrintOpt): string {
		return super.print({
			pre: `&lt;${this.#closing ? '/' : ''}${this.#tag}`,
			post: '&gt;',
			...opt,
		});
	}

	/* NOT FOR BROWSER */

	/**
	 * Get the range of the tag pair
	 *
	 * 获取标签对的范围
	 * @since v1.23.0
	 */
	getRange(): AstRange | undefined {
		const matched = this.findMatchingTag();
		if (!matched) {
			return undefined;
		}
		const {closing} = this,
			range = this.createRange();
		range.setStartAfter(closing ? matched : this);
		range.setEndBefore(closing ? this : matched);
		return range;
	}
}

classes['TagToken'] = __filename;
