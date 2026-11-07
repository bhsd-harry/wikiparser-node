import {

	/* NOT FOR BROWSER */

	Shadow,
} from '../util/debug';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	Config,
} from '../base';
import type {
	AstText,
} from '../internal';

/* NOT FOR BROWSER */

import {states} from '../util/constants';
import {sanitizeId} from '../util/string';
import {getId, getTocData} from '../util/html';
import {sol} from '../mixin/sol';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * section heading
 *
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
@sol()
export abstract class HeadingToken extends Token {
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): SyntaxToken;
	abstract override get nextSibling(): AstText | undefined;

	/* NOT FOR BROWSER */

	/** @private */
	declare tocData?: string;
	abstract override get children(): [Token, SyntaxToken];

	/* NOT FOR BROWSER END */

	override get type(): 'heading' {
		return 'heading';
	}

	/** level of the heading / 标题层级 */
	get level(): number {
		return this.#level;
	}

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: readonly [string?, string?], config: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		this.#level = level;
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(
			input[1],
			/^\s*$/u,
			'heading-trail',
			config,
			accum,
			{'Stage-1': ':', '!ExtToken': ''},
		);
		this.append(token, trail);
	}

	/** 标题格式的等号 */
	#getEquals(): string {
		return '='.repeat(this.level);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.toString(skip) + equals + this.lastChild.toString(skip);
	}

	/** @private */
	override text(): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.text().trim() + equals;
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [title, trail] = this.cloneChildNodes() as [Token, SyntaxToken];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new HeadingToken(this.level, [], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(title);
			token.lastChild.safeReplaceWith(trail);
			return token;
		});
	}

	/**
	 * id属性
	 */
	#getId(): string {
		return getId(this.firstChild.cloneNode());
	}

	/** @private */
	@cached()
	getRenderedId(): string {
		let id = this.#getId();
		const lcId = id.toLowerCase(),
			headings = states.get(this.getRootNode())?.headings;
		if (headings?.has(lcId)) {
			let i = 2;
			for (; headings.has(`${lcId}_${i}`); i++) {
				//
			}
			id += `_${i}`;
			headings.add(`${lcId}_${i}`);
		} else {
			headings?.add(lcId);
		}
		return sanitizeId(id);
	}

	/** @private */
	override toHtmlOrPlain(_: unknown, method: Method): string {
		return this.firstChild[method]().trim();
	}

	/** @private */
	@cached()
	override toHtmlInternal({render}: HtmlOpt = {}): string {
		const {level} = this;
		return `${getTocData(this, render)}<div class="mw-heading mw-heading${level}"><h${level} id="${
			this.getRenderedId()
		}">${super.toHtmlInternal({render})}</h${level}></div>`;
	}
}
