import {cache} from '../../util/lint';
import {Shadow} from '../../util/debug';
import Parser from '../../index';
import {Token} from '../index';
import type {Cached} from '../../util/lint';
import type {Config} from '../../base';
import type {AttributesToken, SyntaxToken} from '../../internal';

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
export abstract class TagToken extends Token {
	#closing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [AttributesToken | SyntaxToken];
	abstract override get firstChild(): AttributesToken | SyntaxToken;
	abstract override get lastChild(): AttributesToken | SyntaxToken;
	abstract override get type(): 'html' | 'tvar';
	abstract get selfClosing(): boolean;

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

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
					if (
						!token.is<this>(type)
						|| type === 'html' && token.name !== name
						|| isFlexible && token.selfClosing
					) {
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
}
