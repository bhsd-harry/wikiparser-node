import {gapped} from '../../mixin/gapped';
import {Token} from '../index';
import type {Config} from '../../base';
import type {AstNodes} from '../../lib/node';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';
import {noEscape} from '../../mixin/noEscape';
import Parser from '../../index';

/* NOT FOR BROWSER END */

/**
 * Paired tags
 *
 * 成对标签
 */
@fixedToken @noEscape
@gapped()
export abstract class TagPairToken extends Token {
	declare readonly name: string;
	readonly #tags: [string, string];
	closed;
	selfClosing;

	abstract override get type(): 'ext' | 'include' | 'translate';
	declare readonly childNodes: readonly [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/** inner wikitext / 内部wikitext */
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
		config?: Config,
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
	override toString(skip?: boolean): string {
		const {
				selfClosing,
				firstChild,
				lastChild,

				/* NOT FOR BROWSER */

				nextSibling,
				name,
				closed,
				type,
			} = this,
			[opening, closing] = this.#tags;

		/* NOT FOR BROWSER */

		if (!closed && nextSibling && type === 'include') {
			Parser.error(`Auto-closing <${name}>`, lastChild);
			this.closed = true;
		}

		/* NOT FOR BROWSER END */

		return selfClosing
			? `<${opening}${firstChild.toString(skip)}/>`
			: `<${opening}${firstChild.toString(skip)}>${lastChild.toString(skip)}${
				this.closed ? `</${closing}>` : ''
			}`;
	}

	/** @private */
	override text(): string {
		const [opening, closing] = this.#tags;
		return this.selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.closed ? `</${closing}>` : ''}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* NOT FOR BROWSER */

		if (key === 'tags') {
			return this.#tags as TokenAttribute<T>;
		}

		/* NOT FOR BROWSER END */

		return key === 'padding' ? this.#tags[0].length + 1 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		const [opening, closing] = this.#tags;
		return super.print(
			this.selfClosing
				? {pre: `&lt;${opening}`, post: '/&gt;'}
				: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''},
		);
	}
}

classes['TagPairToken'] = __filename;
