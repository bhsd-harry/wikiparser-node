import {cache} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {Token} from '../index';
import type {
	Config,
} from '../../base';
import type {AttributesToken, SyntaxToken, AstNodes} from '../../internal';

declare type Child = AttributesToken | SyntaxToken;

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken|SyntaxToken]}`
 */
export abstract class TagToken extends Token {
	#closing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [Child];
	abstract override get firstChild(): Child;
	abstract override get lastChild(): Child;
	abstract override get type(): 'html' | 'tvar';
	abstract get selfClosing(): boolean | undefined;

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: Child, closing: boolean, config?: Config, accum?: Token[]) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.#closing = closing;
		this.#tag = tag;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString(skip)}${this.selfClosing ? '/' : ''}>`;
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
		LINT: return cache<this | undefined>(
			this.#match,
			() => {
				const {
					type,
					name,
					closing,
					selfClosing,
				} = this;
				let {parentNode} = this,
					isVoid = false,
					isFlexible = false;
				if (type === 'html') {
					const [, flexibleTags, voidTags] = this.getAttribute('config').html;
					isVoid = voidTags.includes(name!);
					isFlexible = flexibleTags.includes(name!);
				}
				if (isVoid || isFlexible && selfClosing) { // 自封闭标签
					return this;
				}
				/* c8 ignore next 3 */
				if (!parentNode) {
					return undefined;
				}
				const {childNodes} = parentNode,
					i = childNodes.indexOf(this),
					siblings = closing ? childNodes.slice(0, i) : childNodes.slice(i + 1).reverse(),
					stack = [this],
					{rev} = Shadow;
				let cur = siblings.pop(),
					until: this | undefined;
				while (cur || parentNode.is('list-range') && parentNode.parentNode) {
					if (!cur) {
						const parent: Token = parentNode.parentNode!,
							ch = parent.childNodes,
							j = ch.indexOf(parentNode);
						Array.prototype.push.apply(
							siblings,
							closing ? ch.slice(0, j) : ch.slice(j + 1).reverse(),
						);
						parentNode = parent;
					} else if (cur.is('list-range')) {
						const ch = cur.childNodes;
						Array.prototype.push.apply(siblings, closing ? ch as AstNodes[] : [...ch].reverse());
					} else if (until) {
						if (cur === until) {
							until = undefined;
						}
					} else if (
						!cur.is<this>(type)
						|| type === 'html' && (cur.name !== name || isFlexible && cur.selfClosing)
					) {
						//
					} else if (cur.#closing === closing) {
						/* c8 ignore next 3 */
						if (type === 'tvar') {
							return undefined;
						} else if (
							cur.#match?.[0] === rev
						) {
							const [, matched] = cur.#match;
							if (!matched) {
								return undefined;
							}
							until = matched;
						}
						stack.push(cur);
					} else {
						const top = stack.pop()!;
						if (top === this) {
							return cur;
						}
						top.#match = [rev, cur];
						cur.#match = [rev, top];
					}
					cur = siblings.pop();
				}
				for (const token of stack) {
					token.#match = [rev, undefined];
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
