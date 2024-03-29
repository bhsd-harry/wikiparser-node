import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';
import Parser from '../../index';
import {Token} from '../index';
import type {AstNodes} from '../../lib/node';

/** 成对标签 */
@fixedToken
export abstract class TagPairToken extends Token {
	declare type: 'ext' | 'include';
	declare readonly name: string;
	readonly #tags: [string, string];
	closed;
	selfClosing;

	declare readonly childNodes: readonly [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/* NOT FOR BROWSER END */

	/** 内部wikitext */
	get innerText(): string | undefined {
		return this.selfClosing ? undefined : this.lastChild.text();
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
		this.closed = closed !== '';
		this.selfClosing = closed === undefined;
		this.append(attr, inner);
		const index = typeof attr === 'string' ? -1 : accum.indexOf(attr);
		accum.splice(index === -1 ? Infinity : index, 0, this);
	}

	/** @private */
	override toString(): string {
		const {
				selfClosing,
				firstChild,
				lastChild,

				/* NOT FOR BROWSER */

				nextSibling,
				name,
				closed,
			} = this,
			[opening, closing] = this.#tags;

		/* NOT FOR BROWSER */

		if (!closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild);
			this.closed = true;
		}

		/* NOT FOR BROWSER END */

		return selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${this.closed ? `</${closing}>` : ''}`;
	}

	/** @override */
	override text(): string {
		const [opening, closing] = this.#tags;
		return this.selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.closed ? `</${closing}>` : ''}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		/* NOT FOR BROWSER */

		if (key === 'tags') {
			return [...this.#tags] as TokenAttributeGetter<T>;
		}

		/* NOT FOR BROWSER END */

		return key === 'padding' ? this.#tags[0].length + 1 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @override */
	override print(): string {
		const [opening, closing] = this.#tags;
		return super.print(this.selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''});
	}
}

classes['TagPairToken'] = __filename;
