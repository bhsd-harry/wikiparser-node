import {gapped} from '../../mixin/gapped';
import {noEscape} from '../../mixin/noEscape';
import {Token} from '../index';
import type {
	Config,
	AST,
} from '../../base';
import type {AstNodes} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {undo} from '../../util/debug';
import {fixedToken} from '../../mixin/fixed';
import Parser from '../../index';

/* NOT FOR BROWSER END */

/**
 * Paired tags
 *
 * 成对标签
 */
@fixedToken
@gapped() @noEscape
export abstract class TagPairToken extends Token {
	declare readonly name: string;
	readonly #tags: [string, string];
	#selfClosing;
	closed;

	abstract override get type(): 'ext' | 'include' | 'translate';
	declare readonly childNodes: readonly [AstNodes, AstNodes];
	abstract override get firstChild(): AstNodes;
	abstract override get lastChild(): AstNodes;

	/** inner wikitext / 内部wikitext */
	get innerText(): string | undefined {
		return this.#selfClosing ? undefined : this.lastChild.text();
	}

	/** whether to be self-closing / 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/* NOT FOR BROWSER */

	set selfClosing(value) {
		this.#selfClosing = Boolean(value);
		if (value) {
			const {lastChild} = this;
			if (lastChild.type === 'text') {
				lastChild.replaceData('');
			} else {
				lastChild.replaceChildren();
			}
		}
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
		config?: Config,
		accum: Token[] = [],
	) {
		super(undefined, config);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name];
		this.closed = closed !== '';
		this.#selfClosing = closed === undefined;
		this.append(attr, inner);
		const index = typeof attr === 'string' ? -1 : accum.indexOf(attr);
		accum.splice(index === -1 ? Infinity : index, 0, this);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const {
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

		/* c8 ignore start */
		if (!closed && nextSibling && type === 'include') {
			Parser.error(`Auto-closing <${name}>`, lastChild);
			this.closed = true;
		}
		/* c8 ignore stop */

		/* NOT FOR BROWSER END */

		return this.#selfClosing
			? `<${opening}${firstChild.toString(skip)}/>`
			: `<${opening}${firstChild.toString(skip)}>${lastChild.toString(skip)}${
				this.closed ? `</${closing}>` : ''
			}`;
	}

	/** @private */
	override text(): string {
		const [opening, closing] = this.#tags;
		return this.#selfClosing
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
		PRINT: {
			const [opening, closing] = this.#tags;
			return super.print(
				this.#selfClosing
					? {pre: `&lt;${opening}`, post: '/&gt;'}
					: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''},
			);
		}
	}

	/** @private */
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start);
			json['selfClosing'] = this.#selfClosing;
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/** @private */
	override afterBuild(): void {
		super.afterBuild();
		const /** @implements */ tagPairListener: AstListener = (e, data) => {
			/* c8 ignore start */
			if (this.#selfClosing && e.prevTarget === this.lastChild && this.lastChild.toString()) {
				undo(e, data);
				throw new Error('A self-closing tag does not have inner content.');
			}
			/* c8 ignore stop */
		};
		this.addEventListener(['insert', 'replace', 'text'], tagPairListener);
	}
}

classes['TagPairToken'] = __filename;
