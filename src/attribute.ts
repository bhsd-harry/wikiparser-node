import {generateForChild} from '../util/lint';
import {removeComment} from '../util/string';
import {Shadow} from '../util/debug';
import {fixed} from '../mixin/fixed';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError, Config} from '../index';
import type {AttributesToken} from '../internal';

export type AttributeTypes = 'ext-attr' | 'html-attr' | 'table-attr';

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3},
	commonHtmlAttrs = new Set([
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
		score: new Set([
			'line_width_inches',
			'lang',
			'override_midi',
			'raw',
			'note-language',
			'override_audio',
			'override_ogg',
			'sound',
			'vorbis',
		]),
		seo: new Set([
			'title',
			'title_mode',
			'title_separator',
			'keywords',
			'description',
			'robots',
			'google_bot',
			'image',
			'image_width',
			'image_height',
			'image_alt',
			'type',
			'site_name',
			'locale',
			'section',
			'author',
			'published_time',
			'twitter_site',
		]),
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
export class AttributeToken extends fixed(Token) {
	declare type: AttributeTypes;
	declare name: string;
	declare tag;
	#equal;
	#quotes;

	declare childNodes: [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get children(): [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): Token;
	// @ts-expect-error abstract method
	abstract override get parentNode(): AttributesToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): AttributesToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): AtomToken | this | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): AtomToken | this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AtomToken | this | undefined;

	/** 引号是否匹配 */
	get balanced(): boolean {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/* NOT FOR BROWSER */

	set balanced(value) {
		if (value) {
			this.close();
		}
	}

	/** getValue()的getter */
	get value(): string | true {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/* NOT FOR BROWSER END */

	/**
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
			[type === 'ext-attr' ? 'AstText' : 'Stage-1']: ':', ArgToken: ':', TranscludeToken: ':',
		});
		let valueToken: Token;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
				[`Stage-${stages[type]}`]: ':', ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		} else if (tag === 'gallery' && key === 'caption') {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes!, 'quote', 'extLink', 'magicLink', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
				AstText: ':', LinkToken: ':', FileToken: ':', CategoryToken: ':', ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 5);
		} else if (tag === 'choose' && (key === 'before' || key === 'after')) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes!, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
				ArgToken: ':',
				TranscludeToken: ':',
				LinkToken: ':',
				FileToken: ':',
				CategoryToken: ':',
				QuoteToken: ':',
				ExtLinkToken: ':',
				MagicLinkToken: ':',
				ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 1);
		} else {
			valueToken = new AtomToken(value, 'attr-value', config, accum, {
				[`Stage-${stages[type]}`]: ':',
			});
		}
		super(undefined, config, accum);
		this.type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = quotes;
		this.tag = tag;
		this.seal('tag');
		this.setAttribute('name', removeComment(key).trim().toLowerCase());
	}

	/** @private */
	override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, 'string');
		}
		if (this.parentNode) {
			this.setAttribute('tag', this.parentNode.name);
		}
		this.setAttribute('name', this.firstChild.text().trim().toLowerCase());
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (omit && this.matchesTypes(omit)) {
			return '';
		}
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal
			? `${super.toString(omit, `${this.#equal}${quoteStart}`)}${quoteEnd}`
			: this.firstChild.toString(omit);
	}

	/** @override */
	override text(): string {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @private */
	protected override getGaps(): number {
		return this.#equal ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{balanced, firstChild, lastChild, type, name, tag} = this,
			value = this.getValue();
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
				excerpt: String(root).slice(startIndex, startIndex + 50),
			});
		}
		if (extAttrs[tag] && !extAttrs[tag]!.has(name)
			|| (type === 'ext-attr' ? tag in htmlAttrs : !/\{\{[^{]+\}\}/u.test(name))
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

	/** 获取属性值 */
	getValue(): string | true {
		if (this.#equal) {
			const value = this.lastChild.text();
			if (this.#quotes[1]) {
				return value;
			}
			return this.#quotes[0] ? value.trimEnd() : value.trim();
		}
		return this.type === 'ext-attr' || '';
	}

	/** @override */
	override print(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: `${this.#equal}${quoteStart}`, post: quoteEnd}) : super.print();
	}

	/* NOT FOR BROWSER */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'equal') {
			return this.#equal as TokenAttributeGetter<T>;
		}
		return key === 'quotes' ? this.#quotes as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @override */
	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [AtomToken, Token],
			config = this.getAttribute('config');
		return Shadow.run(() => {
			const token = new AttributeToken(this.type, this.tag, '', this.#equal, '', this.#quotes, config) as this;
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			token.setAttribute('name', this.name);
			return token;
		});
	}

	/** 转义等号 */
	escape(): void {
		this.#equal = '{{=}}';
	}

	/** 闭合引号 */
	close(): void {
		const [opening] = this.#quotes;
		if (opening) {
			this.#quotes[1] = opening;
		}
	}

	/**
	 * 设置属性值
	 * @param value 参数值
	 * @throws `RangeError` 扩展标签属性不能包含 ">"
	 * @throws `RangeError` 同时包含单引号和双引号
	 */
	setValue(value: string | boolean): void {
		if (value === false) {
			this.remove();
			return;
		} else if (value === true) {
			this.#equal = '';
			return;
		} else if (this.type === 'ext-attr' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		} else if (value.includes('"') && value.includes("'")) {
			throw new RangeError('属性值不能同时包含单引号和双引号！');
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(value, this.getAttribute('include'), stages[this.type] + 1, config);
		this.lastChild.replaceChildren(...childNodes);
		if (value.includes('"')) {
			this.#quotes = ["'", "'"] as [string, string];
		} else if (value.includes("'") || !this.#quotes[0]) {
			this.#quotes = ['"', '"'] as [string, string];
		} else {
			this.close();
		}
	}

	/**
	 * 修改属性名
	 * @param key 新属性名
	 * @throws `Error` title和alt属性不能更名
	 */
	rename(key: string): void {
		if (this.name === 'title' || this.name === 'alt' && this.tag === 'img') {
			throw new Error(`${this.name} 属性不能更名！`);
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(key, this.getAttribute('include'), stages[this.type] + 1, config);
		this.firstChild.replaceChildren(...childNodes);
	}
}

Shadow.classes['AttributeToken'] = __filename;
