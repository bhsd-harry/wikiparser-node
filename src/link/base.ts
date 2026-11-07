import {
	MAX_STAGE,
	BuildMethod,
} from '../../util/constants';
import {

	/* NOT FOR BROWSER */

	Shadow,
} from '../../util/debug';
import {
	text,

	/* NOT FOR BROWSER */

	sanitize,
} from '../../util/string';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {Title} from '../../lib/title';

/* NOT FOR BROWSER */

import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token[]]}`
 */
export abstract class LinkBaseToken extends Token {
	declare readonly name: string;
	#bracket = true;
	#delimiter;
	// @ts-expect-error lazy initialization
	#title: Title;

	abstract override get type(): 'gallery-image'
		| 'link'
		| 'category'
		| 'file'
		| 'redirect-target'
		| 'ext-inner'
	;
	declare readonly childNodes: readonly [AtomToken, ...Token[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, ...Token[]];

	/* NOT FOR BROWSER END */

	/** full link / 完整链接 */
	get link(): string | Title {
		return this.#title;
	}

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
		});
		this.insertAt(
			new AtomToken(
				link,
				'link-target',
				config,
				accum,
			),
		);
		if (linkText !== undefined) {
			const inner = new Token(
				linkText,
				{...config, excludes: [...config.excludes, 'list']},
				accum,
			);
			inner.type = 'link-text';
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}
		this.#delimiter = delimiter;
	}

	/** 更新name */
	#setName(): void {
		if (this.type !== 'ext-inner') {
			this.setAttribute('name', this.#title.title);
		}
	}

	/** @private */
	override afterBuild(): void {
		this.#title = this.getTitle();
		if (this.#delimiter.includes('\0')) {
			this.#delimiter = this.buildFromStr(this.#delimiter, BuildMethod.String);
		}
		this.#setName();
		super.afterBuild();
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'bracket') {
			this.#bracket = value as TokenAttribute<'bracket'>;
		} else if (key === 'title') {
			/* c8 ignore next */
			this.#title = value as TokenAttribute<'title'>;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		const str = super.toString(skip, this.#delimiter);
		if (this.#bracket) { // eslint-disable-line unicorn/prefer-ternary
			return `[[${str}]]`;
		}
		return str;
	}

	/** @private */
	override text(): string {
		const {
				length,
				firstChild,
				childNodes,
				type,
			} = this,
			target = firstChild.text(),
			str = length === 1
				? target[
					type === 'link' ?
						'trimStart' :
						'trim'
				]()
				: `${target.trim()}|${
					text(
						childNodes.slice(1)
							.filter(({type: t, name}) => t !== 'image-parameter' || name !== 'invalid'),
						'|',
					)
				}`;
		if (this.#bracket) { // eslint-disable-line unicorn/prefer-ternary
			return `[[${str}]]`;
		}
		return str;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'title' ? this.#title as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(i: number): number {
		return i === 0 ? this.#delimiter.length : 1;
	}

	/** @private */
	getTitle(temporary?: boolean, halfParsed?: boolean): Title {
		return this.normalizeTitle(
			this.firstChild.text(),
			0,
			{halfParsed, temporary, decode: true, selfLink: true},
		);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [link, ...linkText] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this,
				token = new C('', undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(link);
			token.safeAppend(linkText);
			return token;
		});
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		if (this.is('link') || this.is('redirect-target') || this.is('category')) {
			const {link, length, lastChild, type, pageName} = this;
			let attr;
			if (type === 'link' && link.title === pageName && !link.fragment) {
				attr = 'class="mw-selflink"';
			} else {
				const title = link.getTitleAttr();
				attr =
					`href="${link.getUrl()}"${
						link.ns === -2 ? ' class="internal"' : ''
					}${title && ` title="${title}"`}`;
			}
			return `<a ${attr}>${
				type === 'link' && length > 1
					? lastChild.toHtmlInternal({
						...opt,
						nowrap: true,
					})
					: sanitize(this.innerText)
			}</a>`;
		}
		/* c8 ignore next */
		return '';
	}
}
