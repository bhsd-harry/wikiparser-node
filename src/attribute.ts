import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {
	removeComment,
	escape,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError, Config} from '../base';
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
export abstract class AttributeToken extends Token {
	declare type: AttributeTypes;
	declare readonly name: string;
	#tag;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [AtomToken, Token];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): AtomToken | this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	/** 标签名 */
	get tag(): string {
		return this.#tag;
	}

	/** 引号是否匹配 */
	get balanced(): boolean {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

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
		const keyToken = new AtomToken(key, 'attr-key', config, accum, {
		});
		let valueToken: Token;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', MAX_STAGE - 1);
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
		this.setAttribute('name', this.firstChild.text().trim().toLowerCase());
		super.afterBuild();
	}

	/** @private */
	override toString(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.toString(this.#equal + quoteStart) + quoteEnd : this.firstChild.toString();
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
			const fix: LintError.Fix = {
				range: [e.endIndex, e.endIndex],
				text: this.#quotes[0]!,
			};
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
			attrs && !attrs.has(name)
			|| (type === 'ext-attr' ? tag in htmlAttrs : !/\{\{[^{]+\}\}/u.test(name))
			&& !htmlAttrs[tag]?.has(name)
			&& !/^(?:xmlns:[\w:.-]+|data-[^:]*)$/u.test(name)
			&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
		) {
			errors.push(generateForChild(firstChild, rect, 'illegal-attr', 'illegal attribute name'));
		} else if (obsoleteAttrs[tag]?.has(name)) {
			errors.push(generateForChild(firstChild, rect, 'obsolete-attr', 'obsolete attribute', 'warning'));
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			errors.push(generateForChild(lastChild, rect, 'insecure-style', 'insecure style'));
		} else if (name === 'tabindex' && typeof value === 'string' && value.trim() !== '0') {
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
		if (this.#equal) {
			const value = this.lastChild.text();
			if (this.#quotes[1]) {
				return value;
			}
			return value[this.#quotes[0] ? 'trimEnd' : 'trim']();
		}
		return this.type === 'ext-attr' || '';
	}

	/** @private */
	override print(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: escape(this.#equal) + quoteStart, post: quoteEnd}) : super.print();
	}
}
