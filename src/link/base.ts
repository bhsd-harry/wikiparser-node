import {generateForChild} from '../../util/lint';
import {undo, Shadow} from '../../util/debug';
import {
	MAX_STAGE,
	classes,
} from '../../util/constants';
import * as Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token]}`
 */
export abstract class LinkBaseToken extends Token {
	declare type: 'link' | 'category' | 'file' | 'gallery-image' | 'imagemap-image';
	declare readonly name: string;
	#bracket = true;
	#delimiter;
	#title: Title;

	declare readonly childNodes: [AtomToken, ...Token[]];
	abstract override get children(): [AtomToken, ...Token[]];
	abstract override get firstChild(): AtomToken;
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER */

	/** 完整链接 */
	get link(): string | Title {
		return this.#title;
	}

	set link(link: string) {
		this.setTarget(link);
	}

	/** fragment */
	get fragment(): string | undefined {
		return this.#title.fragment;
	}

	set fragment(fragment) {
		if (fragment === undefined) {
			this.setTarget(this.name);
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
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
		this.protectChildren(0);
	}

	/** @private */
	override afterBuild(): void {
		this.#title = this.getTitle();
		this.setAttribute('name', this.#title.title);
		if (this.#delimiter.includes('\0')) {
			this.#delimiter = this.buildFromStr(this.#delimiter, 'string');
		}
		const /** @implements */ linkListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					titleObj = this.getTitle(),
					{title, interwiki, ns, valid} = titleObj;
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的内链目标：${name}`);
				} else if (this.type === 'category' && (interwiki || ns !== 14)
				|| this.type === 'file' && (interwiki || ns !== 6)
				) {
					undo(e, data);
					throw new Error(`${this.type === 'file' ? '文件' : '分类'}链接不可更改命名空间：${name}`);
				} else if (this.type === 'link' && !interwiki && (ns === 6 || ns === 14)
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
	override setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
		if (key === 'bracket') {
			this.#bracket = Boolean(value);
		} else if (key === 'title') {
			this.#title = (value as TokenAttributeSetter<'title'>)!;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		const str = super.toString(omit, this.#delimiter);
		return this.#bracket
			&& !(omit && this.matchesTypes(omit))
			? `[[${str}]]`
			: str;
	}

	/** @override */
	override text(): string {
		const str = super.text('|');
		return this.#bracket ? `[[${str}]]` : str;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'title') {
			return this.#title as TokenAttributeGetter<T>;
		}
		return key === 'padding' ? 2 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 ? this.#delimiter.length : 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{childNodes: [target, linkText], type: linkType} = this,
			{encoded, fragment} = this.#title;
		let rect: BoundingRect | undefined;
		if (linkType === 'link' && target.childNodes.some(({type}) => type === 'template')) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'template in an internal link target', 'warning'));
		}
		if (encoded) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'unnecessary URL encoding in an internal link'));
		}
		if (linkType === 'link' && linkText?.childNodes.some(
			({type, data}) => type === 'text' && data.includes('|'),
		)) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(linkText, rect, 'additional "|" in the link text', 'warning'));
		} else if (linkType !== 'link' && fragment !== undefined) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'useless fragment'));
		}
		return errors;
	}

	/** @private */
	getTitle(): Title {
		return this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
	}

	/** @override */
	override print(): string {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(this: this & {constructor: new (...args: any[]) => unknown}): this {
		const [link, ...linkText] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Shadow.run(() => {
			const token = new this.constructor('', undefined, this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(link);
			token.append(...linkText);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * 设置链接目标
	 * @param link 链接目标
	 */
	setTarget(link: string): void {
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(String(link), this.getAttribute('include'), 2, config),
			token = Shadow.run(() => new AtomToken(undefined, 'link-target', config, [], {
				'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
			}));
		token.append(...childNodes);
		this.firstChild.safeReplaceWith(token);
	}

	/**
	 * 设置链接显示文字
	 * @param linkStr 链接显示文字
	 */
	setLinkText(linkStr?: string): void {
		if (linkStr === undefined) {
			this.childNodes[1]?.remove();
			return;
		}
		const root = Parser.parse(linkStr, this.getAttribute('include'), undefined, this.getAttribute('config'));
		if (this.length === 1) {
			root.type = 'link-text';
			root.setAttribute('acceptable', {
				'Stage-5': ':', QuoteToken: ':', ConverterToken: ':',
			});
			this.insertAt(root);
		} else {
			this.lastChild.replaceChildren(...root.childNodes);
		}
	}
}

classes['LinkBaseToken'] = __filename;
