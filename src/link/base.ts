import {generateForChild} from '../../util/lint';
import {
	MAX_STAGE,
	BuildMethod,
} from '../../util/constants';
import {
	rawurldecode,
} from '../../util/string';
import {BoundingRect} from '../../lib/rect';
import {padded} from '../../mixin/padded';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {
	Config,
	LintError,
} from '../../base';
import type {Title} from '../../lib/title';
import type {
	AstText,
} from '../../internal';

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

	/** full link / 完整链接 */
	get link(): string | Title {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.#title;
	}

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
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
		this.setAttribute('name', this.#title.title);
		super.afterBuild();
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'bracket') {
			this.#bracket = value as TokenAttribute<'bracket'>;
		} else if (key === 'title') {
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
			);
			e.suggestions = [{desc: 'decode', range: [e.startIndex, e.endIndex], text: rawurldecode(target.text())}];
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
					range: [
						e.startIndex + target.getRelativeIndex(j) + textNode.data.indexOf('#'),
						e.endIndex,
					],
					text: '',
					desc: 'remove',
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
}
