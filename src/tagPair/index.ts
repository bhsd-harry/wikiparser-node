import {classes} from '../../util/constants';
import {fixed} from '../../mixin/fixed';
import * as Parser from '../../index';
import {Token} from '../index';
import type {AstNodes} from '../../lib/node';

/** 成对标签 */
export abstract class TagPairToken extends fixed(Token) {
	declare type: 'ext' | 'include';
	declare readonly name: string;
	#selfClosing;
	#closed;
	readonly #tags: [string, string];

	declare readonly childNodes: [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/** 是否闭合 */
	get closed(): boolean {
		return this.#closed;
	}

	/* NOT FOR BROWSER */

	set closed(value) {
		this.#closed ||= value;
	}

	/** 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	set selfClosing(value) {
		if (value !== this.selfClosing && this.lastChild.text()) {
			Parser.warn(`<${this.name}>标签内部的${value ? '文本将被隐藏' : '原有文本将再次可见'}！`);
		}
		this.#selfClosing = value;
	}

	/** 内部wikitext */
	get innerText(): string | undefined {
		return this.selfClosing ? undefined : this.lastChild.text();
	}

	/* NOT FOR BROWSER END */

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
		const {
				firstChild,
				lastChild,
				nextSibling,
				name,
				closed,
			} = this,
			[opening, closing] = this.#tags;
		if (omit && this.matchesTypes(omit)) {
			return '';
		} else if (!closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild);
			this.#closed = true;
		}
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
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'tags') {
			return [...this.#tags] as TokenAttributeGetter<T>;
		}
		return key === 'padding' ? this.#tags[0].length + 1 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	protected override getGaps(): number {
		return 1;
	}

	/** @override */
	override print(): string {
		const [opening, closing] = this.#tags;
		return super.print(this.#selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''});
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			selfClosing: this.#selfClosing,
		};
	}
}

classes['TagPairToken'] = __filename;
