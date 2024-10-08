import {generateForChild} from '../util/lint';
import {
	removeComment,
	escape,

	/* NOT FOR BROWSER */

	sanitizeAttr,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError, Config} from '../base';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {fixedToken} from '../mixin/fixed';

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3};

/* NOT FOR BROWSER END */

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
		'aria-level',
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
	obsoleteTdAttrs = new Set(['axis', 'align', 'bgcolor', 'height', 'width', 'valign']),
	tdAttrs = new Set([...obsoleteTdAttrs, 'abbr', 'headers', 'scope', 'rowspan', 'colspan']),
	typeAttrs = new Set(['type']),
	obsoleteTableAttrs = new Set(
		['summary', 'align', 'bgcolor', 'cellpadding', 'cellspacing', 'frame', 'rules', 'width'],
	),
	brAttrs = new Set(['clear']),
	trAttrs = new Set(['bgcolor', 'align', 'valign']),
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
		br: brAttrs,
		pre: widthAttrs,
		ins: citeAndAttrs,
		del: citeAndAttrs,
		ul: typeAttrs,
		ol: new Set(['type', 'start', 'reversed']),
		li: new Set(['type', 'value']),
		table: new Set([...obsoleteTableAttrs, 'border']),
		caption: blockAttrs,
		tr: trAttrs,
		td: tdAttrs,
		th: tdAttrs,
		img: new Set(['alt', 'src', 'width', 'height', 'srcset']),
		font: new Set(['size', 'color', 'face']),
		hr: widthAttrs,
		data: new Set(['value']),
		time: new Set(['datetime']),
		meta: new Set(['itemprop', 'content']),
		link: new Set(['itemprop', 'href', 'title']),
		gallery: typeAttrs,
		poem: blockAttrs,
		categorytree: blockAttrs,
		combooption: blockAttrs,
	},
	empty = new Set<string>(),
	extAttrs: Record<string, Set<string>> = {
		gallery: new Set(['mode', 'showfilename', 'caption', 'perrow', 'widths', 'heights', 'showthumbnails']),
		poem: new Set(['compact']),
		categorytree: new Set([
			'hideroot',
			'onlyroot',
			'depth',
			'mode',
			'hideprefix',
			'namespaces',
			'showcount',
			'notranslations',
		]),
		combooption: new Set(['name', 'for', 'inline']),
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
	insecureStyle = /expression|(?:accelerator|-o-link(?:-source)?|-o-replace)\s*:|(?:url|image(?:-set)?)\s*\(|attr\s*\([^)]+[\s,]url/u,
	obsoleteAttrs: Record<string, Set<string>> = {
		table: obsoleteTableAttrs,
		td: new Set([...obsoleteTdAttrs, 'scope']),
		th: obsoleteTdAttrs,
		br: brAttrs,
		caption: blockAttrs,
		div: blockAttrs,
		hr: widthAttrs,
		h1: blockAttrs,
		h2: blockAttrs,
		h3: blockAttrs,
		h4: blockAttrs,
		h5: blockAttrs,
		h6: blockAttrs,
		li: typeAttrs,
		p: blockAttrs,
		pre: widthAttrs,
		tr: trAttrs,
		ul: typeAttrs,
	};

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
@fixedToken
export abstract class AttributeToken extends Token {
	declare readonly name: string;
	#type;
	#tag;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [AtomToken, Token];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): AtomToken | this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, Token];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): Token;
	abstract override get parentElement(): AttributesToken | undefined;
	abstract override get nextElementSibling(): AtomToken | this | undefined;
	abstract override get previousElementSibling(): AtomToken | this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): AttributeTypes {
		return this.#type;
	}

	/** 标签名 */
	get tag(): string {
		return this.#tag;
	}

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
		quotes: readonly [string?, string?] = [],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		const keyToken = new AtomToken(
			key,
			'attr-key',
			config,
			accum,
			type === 'ext-attr' ? {AstText: ':'} : {'Stage-2': ':', '!ExtToken': '', '!HeadingToken': ''},
		);
		let valueToken: Token;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
				[`Stage-${stages[type]}`]: ':', ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', MAX_STAGE - 1);
		} else if (
			tag === 'gallery' && key === 'caption'
			|| tag === 'choose' && (key === 'before' || key === 'after')
		) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes!, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
				AstText: ':',
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
		this.#type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = [...quotes];
		this.#tag = tag;
		this.setAttribute('name', removeComment(key).trim().toLowerCase());
	}

	/** @private */
	override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, BuildMethod.String);
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.setAttribute('name', this.firstChild.toString(true).trim().toLowerCase());
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.toString(skip, this.#equal + quoteStart) + quoteEnd : this.firstChild.toString(skip);
	}

	/** @private */
	override text(): string {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @private */
	override getGaps(): number {
		return this.#equal ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{balanced, firstChild, lastChild, type, name, tag} = this,
			value = this.getValue(),
			rect = new BoundingRect(this, start);
		if (!balanced) {
			const e = generateForChild(
				lastChild,
				rect,
				'unclosed-quote',
				Parser.msg('unclosed $1', 'quotes'),
				'warning',
			);
			e.startIndex--;
			e.startCol--;
			const fix: LintError.Fix = {range: [e.endIndex, e.endIndex], text: this.#quotes[0]!};
			if (lastChild.childNodes.some(({type: t, data}) => t === 'text' && /\s/u.test(data))) {
				e.suggestions = [
					{
						desc: 'close',
						...fix,
					},
				];
			} else {
				e.fix = fix;
			}
			errors.push(e);
		}
		const attrs = extAttrs[tag];
		if (
			!attrs?.has(name)
			&& (type === 'ext-attr' ? attrs : !/\{\{[^{]+\}\}/u.test(name))
			&& (
				type === 'ext-attr' && !(tag in htmlAttrs)
				|| !htmlAttrs[tag]?.has(name)
				&& !/^(?:xmlns:[\w:.-]+|data-(?!ooui|mw|parsoid)[^:]*)$/u.test(name)
				&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
			)
		) {
			errors.push(generateForChild(firstChild, rect, 'illegal-attr', 'illegal attribute name'));
		} else if (obsoleteAttrs[tag]?.has(name)) {
			errors.push(generateForChild(firstChild, rect, 'obsolete-attr', 'obsolete attribute', 'warning'));
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			errors.push(generateForChild(lastChild, rect, 'insecure-style', 'insecure style'));
		} else if (name === 'tabindex' && typeof value === 'string' && value !== '0') {
			const e = generateForChild(lastChild, rect, 'illegal-attr', 'nonzero tabindex');
			e.suggestions = [
				{
					desc: 'remove',
					range: [start, e.endIndex],
					text: '',
				},
				{
					desc: '0 tabindex',
					range: [e.startIndex, e.endIndex],
					text: '0',
				},
			];
			errors.push(e);
		}
		return errors;
	}

	/** 获取属性值 */
	getValue(): string | true {
		return this.#equal ? this.lastChild.text().trim() : this.type === 'ext-attr' || '';
	}

	/** @private */
	override print(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: escape(this.#equal) + quoteStart, post: quoteEnd}) : super.print();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [AtomToken, Token],
			k = key.toString(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new AttributeToken(this.type, this.tag, k, this.#equal, '', this.#quotes, config) as this;
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
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
			throw new RangeError('Attributes of an extension tag cannot contain ">"!');
		} else if (value.includes('"') && value.includes(`'`)) {
			throw new RangeError('Attribute values cannot contain single and double quotes simultaneously!');
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(value, this.getAttribute('include'), stages[this.type] + 1, config);
		this.lastChild.replaceChildren(...childNodes);
		if (value.includes('"')) {
			this.#quotes = [`'`, `'`] as [string, string];
		} else if (value.includes(`'`) || !this.#quotes[0]) {
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
			throw new Error(`${this.name} attribute cannot be renamed!`);
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(key, this.getAttribute('include'), stages[this.type] + 1, config);
		this.firstChild.replaceChildren(...childNodes);
	}

	/** @private */
	override toHtmlInternal(): string {
		const {type, name, tag, lastChild} = this;
		if (
			type === 'ext-attr' && !(tag in htmlAttrs)
			|| !htmlAttrs[tag]?.has(name)
			&& !/^(?:xmlns:[\w:.-]+|data-(?!ooui|mw|parsoid)[^:]*)$/u.test(name)
			&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
		) {
			return '';
		}
		const value = lastChild.toHtmlInternal().trim();
		if (name === 'style' && insecureStyle.test(value) || name === 'tabindex' && value !== '0') {
			return '';
		}
		return `${name}="${sanitizeAttr(value.replace(/\s+|&#10;/gu, name === 'id' ? '_' : ' '))}"`;
	}
}

classes['AttributeToken'] = __filename;
