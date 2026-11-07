import {cache} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {Token} from '../index';
import type {
	Config,
} from '../../base';
import type {AttributesToken, SyntaxToken} from '../../internal';

/* PRINT ONLY */

import Parser from '../../index';

/* PRINT ONLY END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): [Child];

	/* NOT FOR BROWSER END */

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/* NOT FOR BROWSER */

	/** @private */
	get tag(): string {
		return this.#tag;
	}

	/* NOT FOR BROWSER END */

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

	/**
	 * Find the matching tag
	 *
	 * 搜索匹配的标签
	 */
	findMatchingTag(): this | undefined {
		return cache<this | undefined>(
			this.#match,
			() => {
				const {
					type,
					name,
					closing,
				} = this;
				const {parentNode} = this,
					{childNodes} = parentNode!,
					i = childNodes.indexOf(this),
					siblings = closing ? childNodes.slice(0, i) : childNodes.slice(i + 1).reverse(),
					stack = [this],
					{viewOnly} = Parser,
					{rev} = Shadow;
				let cur = siblings.pop(),
					until: this | undefined;
				while (cur) {
					if (until) {
						if (cur === until) {
							until = undefined;
						}
					} else if (
						!cur.is<this>(type)
						|| cur.name !== name
					) {
						//
					} else if (cur.#closing === closing) {
						/* c8 ignore next 3 */
						if (
							cur.#match?.[0] === rev
							&& viewOnly // eslint-disable-line unicorn/prefer-simple-condition-first
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
						if (viewOnly) {
							top.#match = [rev, cur];
							cur.#match = [rev, top];
						}
					}
					cur = siblings.pop();
				}
				if (viewOnly) {
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
