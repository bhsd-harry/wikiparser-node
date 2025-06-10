import {generateForChild} from '../../util/lint';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {
	rawurldecode,

	/* NOT FOR BROWSER */

	encode,
	sanitize,
} from '../../util/string';
import {BoundingRect} from '../../lib/rect';
import {padded} from '../../mixin/padded';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {
	Config,
	LintError,
	AST,
} from '../../base';
import type {Title} from '../../lib/title';
import type {
	AstText,

	/* NOT FOR BROWSER */

	LinkToken,
	RedirectTargetToken,
} from '../../internal';

/* NOT FOR BROWSER */

import {undo, Shadow} from '../../util/debug';
import {noEscape} from '../../mixin/noEscape';
import Parser from '../../index';

/* NOT FOR BROWSER END */

/**
 * 是否为普通内链
 * @param type 节点类型
 */
const isLink = (type: string): boolean => type === 'redirect-target' || type === 'link';

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token[]]}`
 */
@noEscape
@padded('[[')
export abstract class LinkBaseToken extends Token {
	declare readonly name: string;
	#bracket = true;
	#delimiter;
	#title: Title;

	abstract override get type(): 'link' | 'category' | 'file' | 'gallery-image' | 'imagemap-image' | 'redirect-target';
	declare readonly childNodes: readonly [AtomToken, ...Token[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, ...Token[]];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

	/** full link / 完整链接 */
	get link(): string | Title {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.#title;
	}

	/* PRINT ONLY */

	/** 片段标识符 */
	get fragment(): string | undefined {
		return this.#title.fragment;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	set fragment(fragment) {
		this.setFragment(fragment);
	}

	set link(link: string) { // eslint-disable-line grouped-accessor-pairs, jsdoc/require-jsdoc
		this.setTarget(link);
	}

	/** interwiki */
	get interwiki(): string {
		return this.#title.interwiki;
	}

	/** @throws `RangeError` 非法的跨维基前缀 */
	set interwiki(interwiki) {
		if (isLink(this.type)) {
			const {prefix, main, fragment} = this.#title,
				link = `${interwiki}:${prefix}${main}${fragment === undefined ? '' : `#${fragment}`}`;
			/* istanbul ignore if */
			if (interwiki && !this.isInterwiki(link)) {
				throw new RangeError(`${interwiki} is not a valid interwiki prefix!`);
			}
			this.setTarget(link);
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
			AtomToken: 0, Token: 1,
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
			'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, accum, {
				'Stage-5': ':', QuoteToken: ':', ConverterToken: ':',
			});
			inner.type = 'link-text';
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}
		this.#delimiter = delimiter;

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override afterBuild(): void {
		this.#title = this.getTitle();
		if (this.#delimiter.includes('\0')) {
			this.#delimiter = this.buildFromStr(this.#delimiter, BuildMethod.String);
		}
		this.setAttribute('name', this.#title.title);
		super.afterBuild();

		/* NOT FOR BROWSER */

		const /** @implements */ linkListener: AstListener = (e, data) => {
			const {prevTarget} = e,
				{type} = this;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					titleObj = this.getTitle(),
					{title, interwiki, ns, valid} = titleObj;
				if (!valid) {
					undo(e, data);
					throw new Error(`Invalid link target: ${name}`);
				} else if (
					type === 'category' && (interwiki || ns !== 14)
					|| (type === 'file' || type === 'gallery-image' || type === 'imagemap-image')
					&& (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(
						`${type === 'category' ? 'Category' : 'File'} link cannot change namespace: ${name}`,
					);
				} else if (
					type === 'link' && !interwiki && (ns === 6 || ns === 14)
					&& !name.trim().startsWith(':')
				) {
					const {firstChild} = prevTarget;
					if (firstChild?.type === 'text') {
						firstChild.insertData(0, ':');
					} else {
						prevTarget.prepend(':');
					}
				}
				this.#title = titleObj;
				this.setAttribute('name', title);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'bracket') {
			this.#bracket = value as TokenAttribute<'bracket'>;
		} else /* istanbul ignore if */ if (key === 'title') {
			this.#title = value as TokenAttribute<'title'>;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		const str = super.toString(skip, this.#delimiter);
		return this.#bracket ? `[[${str}]]` : str;
	}

	/** @private */
	override text(): string {
		const str = super.text('|');
		return this.#bracket ? `[[${str}]]` : str;
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
	override lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const errors = super.lint(start, re),
			{childNodes: [target, linkText], type} = this,
			{encoded, fragment} = this.#title,
			rect = new BoundingRect(this, start);
		if (target.childNodes.some(({type: t}) => t === 'template')) {
			errors.push(
				generateForChild(
					target,
					rect,
					'unknown-page',
					'template in an internal link target',
					'warning',
				),
			);
		}
		if (encoded) {
			const e = generateForChild(
				target,
				rect,
				'url-encoding',
				'unnecessary URL encoding in an internal link',
				'warning',
			);
			e.fix = {desc: 'decode', range: [e.startIndex, e.endIndex], text: rawurldecode(target.text())};
			errors.push(e);
		}
		if (type === 'link' || type === 'category') {
			const j = linkText?.childNodes.findIndex(c => c.type === 'text' && c.data.includes('|')),
				textNode = linkText?.childNodes[j!] as AstText | undefined;
			if (textNode) {
				const e = generateForChild(
						linkText!,
						rect,
						'pipe-like',
						'additional "|" in the link text',
						'warning',
					),
					i = e.startIndex + linkText!.getRelativeIndex(j);
				e.suggestions = [
					{
						desc: 'escape',
						range: [i, i + textNode.data.length],
						text: textNode.data.replace(/\|/gu, '&#124;'),
					},
				];
				errors.push(e);
			}
		}
		if (fragment !== undefined && !isLink(type)) {
			const e = generateForChild(target, rect, 'no-ignored', 'useless fragment', 'warning'),
				j = target.childNodes.findIndex(c => c.type === 'text' && c.data.includes('#')),
				textNode = target.childNodes[j] as AstText | undefined;
			if (textNode) {
				e.fix = {
					desc: 'remove',
					range: [
						e.startIndex + target.getRelativeIndex(j) + textNode.data.indexOf('#'),
						e.endIndex,
					],
					text: '',
				};
			}
			errors.push(e);
		}
		return errors;
	}

	/** @private */
	getTitle(temporary?: boolean, halfParsed?: boolean): Title {
		return this.normalizeTitle(
			this.firstChild.text(),
			0,
			{halfParsed, temporary, decode: true, selfLink: true},
		);
	}

	/** @private */
	override print(): string {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start),
			{type, fragment} = this;
		if (fragment !== undefined && (type === 'link' || type === 'redirect-target')) {
			json['fragment'] = fragment;
		}
		return json;
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

	/**
	 * Set the link target
	 *
	 * 设置链接目标
	 * @param link link target / 链接目标
	 */
	setTarget(link: string): void {
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(link, this.getAttribute('include'), 2, config),
			token = Shadow.run(() => new AtomToken(undefined, 'link-target', config, [], {
				'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
			}));
		token.safeAppend(childNodes);
		this.firstChild.safeReplaceWith(token);
	}

	/**
	 * Set the fragment
	 *
	 * 设置片段标识符
	 * @param fragment 片段标识符
	 */
	setFragment(fragment?: string): void {
		const {type, name} = this;
		if (fragment === undefined || isLink(type)) {
			fragment &&= encode(fragment);
			this.setTarget(name + (fragment === undefined ? '' : `#${fragment}`));
		}
	}

	/**
	 * Set the link text
	 *
	 * 设置链接显示文字
	 * @param linkStr link text / 链接显示文字
	 */
	setLinkText(linkStr?: string): void {
		if (linkStr === undefined) {
			this.childNodes[1]?.remove();
			return;
		}
		const root = Parser
			.parse(linkStr, this.getAttribute('include'), undefined, this.getAttribute('config'));
		if (this.length === 1) {
			root.type = 'link-text';
			root.setAttribute('acceptable', {
				'Stage-5': ':', QuoteToken: ':', ConverterToken: ':',
			});
			this.insertAt(root);
		} else {
			this.lastChild.safeReplaceChildren(root.childNodes);
		}
	}

	/** @private */
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		if (this.is<LinkToken>('link') || this.is<RedirectTargetToken>('redirect-target')) {
			const {link, length, lastChild, type} = this,
				title = link.getTitleAttr();
			return `<a${link.interwiki && ' class="extiw"'} href="${link.getUrl()}"${title && ` title="${title}"`}>${
				type === 'link' && length > 1
					? lastChild.toHtmlInternal({
						...opt,
						nowrap: true,
					})
					: sanitize(this.innerText)
			}</a>`;
		}
		return '';
	}
}

classes['LinkBaseToken'] = __filename;
