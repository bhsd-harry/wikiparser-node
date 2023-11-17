import {fixed} from '../../mixin/fixed';
import Parser from '../../index';
import {Token} from '..';
import type {AstNodes} from '../../lib/node';

/** 成对标签 */
export abstract class TagPairToken extends fixed(Token) {
	declare type: 'ext' | 'include';
	declare name: string;
	declare childNodes: [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/** @browser */
	#selfClosing;
	/** @browser */
	#closed;
	/** @browser */
	#tags: [string, string];

	/**
	 * 是否闭合
	 * @browser
	 */
	get closed(): boolean {
		return this.#closed;
	}

	set closed(value) {
		this.#closed ||= value;
	}

	/** 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	set selfClosing(value) {
		if (value !== this.#selfClosing && this.lastChild.text()) {
			Parser.warn(`<${this.name}>标签内部的${value ? '文本将被隐藏' : '原有文本将再次可见'}！`);
		}
		this.#selfClosing = value;
	}

	/** 内部wikitext */
	get innerText(): string | undefined {
		return this.#selfClosing ? undefined : this.lastChild.text();
	}

	/**
	 * @browser
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
		super(undefined, config, true);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name];
		this.#selfClosing = closed === undefined;
		this.#closed = closed !== '';
		this.append(attr, inner);
		let index = typeof attr === 'string' ? -1 : accum.indexOf(attr);
		if (index === -1 && typeof inner !== 'string') {
			index = accum.indexOf(inner);
		}
		if (index === -1) {
			index = Infinity;
		}
		accum.splice(index, 0, this);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const {firstChild, lastChild, nextSibling, name} = this,
			[opening, closing] = this.#tags;
		if (omit && this.matchesTypes(omit)) {
			return '';
		} else if (!this.closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild);
			this.#closed = true;
		}
		return this.#selfClosing
			? `<${opening}${firstChild.toString(omit)}/>`
			: `<${opening}${firstChild.toString(omit)}>${lastChild.toString(omit)}${
				this.closed ? `</${closing}>` : ''
			}`;
	}

	/**
	 * @override
	 * @browser
	 */
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

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const [opening, closing] = this.#tags;
		return super.print(this.#selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''});
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'tags' ? [...this.#tags] as TokenAttributeGetter<T> : super.getAttribute(key);
	}
}

Parser.classes['TagPairToken'] = __filename;
