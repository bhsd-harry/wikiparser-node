import {generateForChild} from '../../util/lint';
import {
	MAX_STAGE,
	BuildMethod,
} from '../../util/constants';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {AstText} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token]}`
 */
export abstract class LinkBaseToken extends Token {
	declare type: 'link' | 'category' | 'file' | 'gallery-image' | 'imagemap-image';
	#bracket = true;
	#delimiter;
	#title: Title;

	declare readonly childNodes: readonly [AtomToken, ...Token[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, accum, {
			});
			inner.type = 'link-text';
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}
		this.#delimiter = delimiter;
	}

	/** @private */
	override afterBuild(): void {
		this.#title = this.getTitle();
		if (this.#delimiter.includes('\0')) {
			this.#delimiter = this.buildFromStr(this.#delimiter, BuildMethod.String);
		}
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
	override toString(): string {
		const str = super.toString(this.#delimiter);
		return this.#bracket ? `[[${str}]]` : str;
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
	override getGaps(i: number): number {
		return i === 0 ? this.#delimiter.length : 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{childNodes: [target, linkText], type: linkType} = this,
			{encoded, fragment} = this.#title;
		let rect: BoundingRect | undefined;
		if (target.childNodes.some(({type}) => type === 'template')) {
			rect = {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(
				generateForChild(target, rect, 'unknown-page', 'template in an internal link target', 'warning'),
			);
		}
		if (encoded) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(target, rect, 'url-encoding', 'unnecessary URL encoding in an internal link'));
		}
		if (linkType === 'link' || linkType === 'category') {
			const textNode = linkText?.childNodes.find((c): c is AstText => c.type === 'text' && c.data.includes('|'));
			if (textNode) {
				rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
				const e = generateForChild(linkText!, rect, 'pipe-like', 'additional "|" in the link text', 'warning');
				e.suggestions = [
					{
						desc: 'escape',
						range: [
							e.startIndex + textNode.getRelativeIndex(),
							e.startIndex + textNode.getRelativeIndex() + textNode.data.length,
						],
						text: textNode.data.replace(/\|/gu, '&#124;'),
					},
				];
				errors.push(e);
			}
		}
		if (linkType !== 'link' && fragment !== undefined) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			const e = generateForChild(target, rect, 'no-ignored', 'useless fragment'),
				textNode = target.childNodes.find((c): c is AstText => c.type === 'text' && c.data.includes('#'));
			if (textNode) {
				e.fix = {
					range: [e.startIndex + textNode.getRelativeIndex() + textNode.data.indexOf('#'), e.endIndex],
					text: '',
				};
			}
			errors.push(e);
		}
		return errors;
	}

	/** @private */
	getTitle(): Title {
		return this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
	}
}
