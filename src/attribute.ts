import {generateForChild} from '../util/lint';
import {removeComment} from '../util/string';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError, Config} from '../index';
import type {AttributesToken} from '../internal';

export type AttributeTypes = 'ext-attr' | 'html-attr' | 'table-attr';

const commonHtmlAttrs = new Set([
		'id',
		'class',
		'style',
		'lang',
		'dir',
		'title',
		'tabindex',
		'aria-describedby',
		'aria-flowto',
		'aria-hidden',
		'aria-label',
		'aria-labelledby',
		'aria-owns',
		'role',
		'about',
		'property',
		'resource',
		'datatype',
		'typeof',
		'itemid',
		'itemprop',
		'itemref',
		'itemscope',
		'itemtype',
	]),
	blockAttrs = new Set(['align']),
	citeAttrs = new Set(['cite']),
	citeAndAttrs = new Set(['cite', 'datetime']),
	widthAttrs = new Set(['width']),
	tdAttrs = new Set(
		['align', 'valign', 'abbr', 'axis', 'headers', 'scope', 'rowspan', 'colspan', 'width', 'height', 'bgcolor'],
	),
	typeAttrs = new Set(['type']),
	htmlAttrs: Record<string, Set<string>> = {
		div: blockAttrs,
		h1: blockAttrs,
		h2: blockAttrs,
		h3: blockAttrs,
		h4: blockAttrs,
		h5: blockAttrs,
		h6: blockAttrs,
		blockquote: citeAttrs,
		q: citeAttrs,
		p: blockAttrs,
		br: new Set(['clear']),
		pre: widthAttrs,
		ins: citeAndAttrs,
		del: citeAndAttrs,
		ul: typeAttrs,
		ol: new Set(['type', 'start', 'reversed']),
		li: new Set(['type', 'value']),
		table: new Set(
			['summary', 'width', 'border', 'frame', 'rules', 'cellspacing', 'cellpadding', 'align', 'bgcolor'],
		),
		caption: blockAttrs,
		tr: new Set(['bgcolor', 'align', 'valign']),
		td: tdAttrs,
		th: tdAttrs,
		img: new Set(['alt', 'src', 'width', 'height', 'srcset']),
		font: new Set(['size', 'color', 'face']),
		hr: widthAttrs,
		rt: new Set(['rbspan']),
		data: new Set(['value']),
		time: new Set(['datetime']),
		meta: new Set(['itemprop', 'content']),
		link: new Set(['itemprop', 'href', 'title']),
		gallery: new Set(['mode', 'showfilename', 'caption', 'perrow', 'widths', 'heights', 'showthumbnails', 'type']),
		poem: new Set(['compact', 'align']),
		categorytree: new Set([
			'align',
			'hideroot',
			'onlyroot',
			'depth',
			'mode',
			'hideprefix',
			'namespaces',
			'showcount',
			'notranslations',
		]),
		combooption: new Set(['name', 'for', 'inline', 'align']),
	},
	empty = new Set<string>(),
	extAttrs: Record<string, Set<string>> = {
		nowiki: empty,
		indicator: new Set(['name']),
		langconvert: new Set(['from', 'to']),
		ref: new Set(['group', 'name', 'extends', 'follow', 'dir']),
		references: new Set(['group', 'responsive']),
		charinsert: new Set(['label']),
		choose: new Set(['uncached', 'before', 'after']),
		option: new Set(['weight']),
		imagemap: empty,
		inputbox: empty,
		templatestyles: new Set(['src', 'wrapper']),
		dynamicpagelist: empty,
		poll: new Set(['id', 'show-results-before-voting']),
		sm2: typeAttrs,
		flashmp3: typeAttrs,
		tab: new Set([
			'nested',
			'name',
			'index',
			'class',
			'block',
			'inline',
			'openname',
			'closename',
			'collapsed',
			'dropdown',
			'style',
			'bgcolor',
			'container',
			'id',
			'title',
		]),
		tabs: new Set(['plain', 'class', 'container', 'id', 'title', 'style']),
		combobox: new Set(['placeholder', 'value', 'id', 'class', 'text', 'dropdown', 'style']),
	},
	insecureStyle = new RegExp(
		`${
			'expression'
		}|${
			'(?:filter|accelerator|-o-link(?:-source)?|-o-replace)\\s*:'
		}|${
			'(?:url|image(?:-set)?)\\s*\\('
		}|${
			'attr\\s*\\([^)]+[\\s,]url'
		}`,
		'u',
	);

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
export class AttributeToken extends Token {
	declare type: AttributeTypes;
	declare name: string;
	declare childNodes: [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;
	// @ts-expect-error abstract method
	abstract override get parentNode(): AttributesToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): AtomToken | this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | this | undefined;

	/** @browser */
	#equal;
	/** @browser */
	#quotes;
	/** @browser */
	#tag;

	/**
	 * 引号是否匹配
	 * @browser
	 */
	get balanced(): boolean {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/**
	 * 标签名
	 * @browser
	 */
	get tag(): string {
		return this.#tag;
	}

	/**
	 * getValue()的getter
	 * @browser
	 */
	get value(): string | true {
		return this.getValue();
	}

	/**
	 * @browser
	 * @param type 标签类型
	 * @param tag 标签名
	 * @param key 属性名
	 * @param equal 等号
	 * @param value 属性值
	 * @param quotes 引号
	 */
	constructor(
		type: AttributeTypes,
		tag: string,
		key: string,
		equal = '',
		value?: string,
		quotes: [string?, string?] = [],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		const keyToken = new AtomToken(key, 'attr-key', config, accum, {
		});
		let valueToken: Token;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		} else if (tag === 'gallery' && key === 'caption') {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes!, 'quote', 'extLink', 'magicLink', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 5);
		} else if (tag === 'choose' && (key === 'before' || key === 'after')) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes!, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 1);
		} else {
			valueToken = new AtomToken(value, 'attr-value', config, accum, {
			});
		}
		super(undefined, config, accum);
		this.type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = quotes;
		this.#tag = tag;
		this.setAttribute('name', removeComment(key).trim().toLowerCase());
	}

	/** @private */
	protected override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, 'string');
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.setAttribute('name', this.firstChild.text().trim().toLowerCase());
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal
			? `${super.toString(omit, `${this.#equal}${quoteStart}`)}${quoteEnd}`
			: this.firstChild.toString(omit);
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @private */
	protected override getGaps(i: number): number {
		return this.#equal && i === 0 ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{balanced, firstChild, lastChild, type, name, value} = this,
			tag = this.#tag;
		let rect: BoundingRect | undefined;
		if (!balanced) {
			const root = this.getRootNode();
			rect = {start, ...root.posFromIndex(start)};
			const e = generateForChild(lastChild, rect, 'unclosed quotes', 'warning'),
				startIndex = e.startIndex - 1;
			errors.push({
				...e,
				startIndex,
				startCol: e.startCol - 1,
			});
		}
		if (extAttrs[tag] && !extAttrs[tag]!.has(name)
			|| (type !== 'ext-attr' && !/\{\{[^{]+\}\}/u.test(name) || tag in htmlAttrs)
			&& !htmlAttrs[tag]?.has(name) && !/^(?:xmlns:[\w:.-]+|data-[^:]*)$/u.test(name)
			&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
		) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(firstChild, rect, 'illegal attribute name'));
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(lastChild, rect, 'insecure style'));
		} else if (name === 'tabindex' && typeof value === 'string' && value.trim() !== '0') {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(lastChild, rect, 'nonzero tabindex'));
		}
		return errors;
	}

	/**
	 * 获取属性值
	 * @browser
	 */
	getValue(): string | true {
		if (this.#equal) {
			const value = this.lastChild.text();
			if (this.#quotes[1]) {
				return value;
			}
			return value.trim();
		}
		return this.type === 'ext-attr' || '';
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: `${this.#equal}${quoteStart}`, post: quoteEnd}) : super.print();
	}
}
