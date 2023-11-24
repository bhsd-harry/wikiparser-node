import Parser from '../../index';
import {Token} from '../index';
import type {AstNodes} from '../../lib/node';

/** 成对标签 */
export abstract class TagPairToken extends Token {
	declare type: 'ext' | 'include';
	declare name: string;
	#selfClosing;
	#closed;
	#tags: [string, string];

	declare childNodes: [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/** 是否闭合 */
	get closed(): boolean {
		return this.#closed;
	}

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭；约定`undefined`表示自封闭，`''`表示未闭合
	 */
	constructor(
		name: string,
		attr: string | Token,
		inner: string | Token,
		closed?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name];
		this.#selfClosing = closed === undefined;
		this.#closed = closed !== '';
		this.append(attr, inner);
		const index = typeof attr === 'string' ? -1 : accum.indexOf(attr);
		accum.splice(index === -1 ? Infinity : index, 0, this);
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		const {firstChild, lastChild} = this,
			[opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${firstChild.toString(omit)}/>`
			: `<${opening}${firstChild.toString(omit)}>${lastChild.toString(omit)}${
				this.closed ? `</${closing}>` : ''
			}`;
	}

	/** @override */
	override text(): string {
		const [opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.closed ? `</${closing}>` : ''}`;
	}

	/** @private */
	protected override getPadding(): number {
		return this.#tags[0].length + 1;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 ? 1 : 1;
	}

	/** @override */
	override print(): string {
		const [opening, closing] = this.#tags;
		return super.print(this.#selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''});
	}
}
