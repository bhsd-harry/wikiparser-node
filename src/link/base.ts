import {generateForChild, fixByRemove, fixByDecode, fixByPipe} from '../../util/lint';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {
	isLink,

	/* NOT FOR BROWSER */

	undo,
	Shadow,
} from '../../util/debug';
import {BoundingRect} from '../../lib/rect';
import {padded} from '../../mixin/padded';
import {noEscape} from '../../mixin/noEscape';
import Parser from '../../index';
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
	CategoryToken,
} from '../../internal';

/* NOT FOR BROWSER */

import {sanitize} from '../../util/string';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token[]]}`
 */
@noEscape @padded('[[')
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
		LSP: return this.#title;
	}

	/* PRINT ONLY */

	/** 片段标识符 */
	get fragment(): string | undefined {
		LSP: return this.#title.fragment;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	set fragment(fragment) {
		this.setFragment(fragment);
	}

	set link(link: string) {
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
			if (prevTarget?.is<AtomToken>('link-target')) {
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
		LINT: {
			const errors = super.lint(start, re),
				{childNodes: [target, linkText], type} = this,
				{encoded, fragment} = this.#title,
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				rect = new BoundingRect(this, start);
			let rule: LintError.Rule = 'unknown-page',
				s = lintConfig.getSeverity(rule);
			if (s && target.childNodes.some(({type: t}) => t === 'template')) {
				errors.push(generateForChild(target, rect, rule, 'template-in-link', s));
			}
			rule = 'url-encoding';
			s = lintConfig.getSeverity(rule);
			if (s && encoded) {
				const e = generateForChild(target, rect, rule, 'unnecessary-encoding', s);
				if (computeEditInfo || fix) {
					e.fix = fixByDecode(e, target);
				}
				errors.push(e);
			}
			rule = 'pipe-like';
			s = lintConfig.getSeverity(rule, 'link');
			if (s && (type === 'link' || type === 'category')) {
				const j = linkText?.childNodes.findIndex(c => c.type === 'text' && c.data.includes('|')),
					textNode = linkText?.childNodes[j!] as AstText | undefined;
				if (textNode) {
					const e = generateForChild(linkText!, rect, rule, 'pipe-in-link', s);
					if (computeEditInfo) {
						const i = e.startIndex + linkText!.getRelativeIndex(j);
						e.suggestions = [fixByPipe(i, textNode.data)];
					}
					errors.push(e);
				}
			}
			rule = 'no-ignored';
			s = lintConfig.getSeverity(rule, 'fragment');
			if (s && fragment !== undefined && !isLink(type)) {
				const e = generateForChild(target, rect, rule, 'useless-fragment', s);
				if (computeEditInfo || fix) {
					const j = target.childNodes.findIndex(c => c.type === 'text' && c.data.includes('#')),
						textNode = target.childNodes[j] as AstText | undefined;
					if (textNode) {
						e.fix = fixByRemove(e, target.getRelativeIndex(j) + textNode.data.indexOf('#'));
					}
				}
				errors.push(e);
			}
			return errors;
		}
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
		PRINT: return super.print(
			this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter},
		);
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start),
				{type, fragment} = this;
			if (fragment !== undefined && (type === 'link' || type === 'redirect-target')) {
				json['fragment'] = fragment;
			}
			return json;
		}
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

	/* istanbul ignore next */
	/**
	 * Set the link target
	 *
	 * 设置链接目标
	 * @param link link target / 链接目标
	 */
	setTarget(link: string): void {
		require('../../addon/link');
		this.setTarget(link);
	}

	/* istanbul ignore next */
	/**
	 * Set the fragment
	 *
	 * 设置片段标识符
	 * @param fragment URI fragment / 片段标识符
	 */
	setFragment(fragment?: string): void {
		require('../../addon/link');
		this.setFragment(fragment);
	}

	/**
	 * Set the link text
	 *
	 * 设置链接显示文字
	 * @param linkStr link text / 链接显示文字
	 */
	setLinkText(linkStr?: string): void {
		require('../../addon/link');
		this.setLinkText(linkStr);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		if (
			this.is<LinkToken>('link')
			|| this.is<RedirectTargetToken>('redirect-target')
			|| this.is<CategoryToken>('category')
		) {
			const {link, length, lastChild, type, pageName} = this;
			let attr;
			if (type === 'link' && link.title === pageName && !link.fragment) {
				attr = 'class="mw-selflink"';
			} else {
				const title = link.getTitleAttr();
				attr = `${link.interwiki && 'class="extiw" '}href="${link.getUrl()}"${title && ` title="${title}"`}`;
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
		/* istanbul ignore next */
		return '';
	}
}

classes['LinkBaseToken'] = __filename;
