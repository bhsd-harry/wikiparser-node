import {generateForChild, fixByRemove, fixByDecode, fixByPipe} from '../../util/lint';
import {
	MAX_STAGE,
	BuildMethod,
} from '../../util/constants';
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
		let rule: LintError.Rule = 'unknown-page',
			s = Parser.lintConfig.getSeverity(rule);
		if (s && target.childNodes.some(({type: t}) => t === 'template')) {
			errors.push(generateForChild(target, rect, rule, 'template in an internal link target', s));
		}
		rule = 'url-encoding';
		s = Parser.lintConfig.getSeverity(rule);
		if (s && encoded) {
			const e = generateForChild(target, rect, rule, 'unnecessary URL encoding in an internal link', s);
			e.fix = fixByDecode(e, target);
			errors.push(e);
		}
		rule = 'pipe-like';
		s = Parser.lintConfig.getSeverity(rule, 'link');
		if (s && (type === 'link' || type === 'category')) {
			const j = linkText?.childNodes.findIndex(c => c.type === 'text' && c.data.includes('|')),
				textNode = linkText?.childNodes[j!] as AstText | undefined;
			if (textNode) {
				const e = generateForChild(linkText!, rect, rule, 'additional "|" in the link text', s),
					i = e.startIndex + linkText!.getRelativeIndex(j);
				e.suggestions = [fixByPipe(i, textNode.data)];
				errors.push(e);
			}
		}
		rule = 'no-ignored';
		s = Parser.lintConfig.getSeverity(rule, 'fragment');
		if (s && fragment !== undefined && !isLink(type)) {
			const e = generateForChild(target, rect, rule, 'useless fragment', s),
				j = target.childNodes.findIndex(c => c.type === 'text' && c.data.includes('#')),
				textNode = target.childNodes[j] as AstText | undefined;
			if (textNode) {
				e.fix = fixByRemove(e, target.getRelativeIndex(j) + textNode.data.indexOf('#'));
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
}
