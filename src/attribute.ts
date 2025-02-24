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
import {commonHtmlAttrs, extAttrs, htmlAttrs, obsoleteAttrs} from '../util/sharable';
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

declare type Child = AtomToken | AttributeToken | undefined;
export type AttributeTypes = 'ext-attr' | 'html-attr' | 'table-attr';

const insecureStyle =
	/expression|(?:accelerator|-o-link(?:-source)?|-o-replace)\s*:|(?:url|image(?:-set)?)\s*\(|attr\s*\([^)]+[\s,]url/u;

/**
 * attribute of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
@fixedToken
export abstract class AttributeToken extends Token {
	declare readonly name: string;
	readonly #type;
	#tag;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [AtomToken, Token];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): Child;
	abstract override get previousSibling(): Child;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, Token];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): Token;
	abstract override get parentElement(): AttributesToken | undefined;
	abstract override get nextElementSibling(): Child;
	abstract override get previousElementSibling(): Child;

	/* NOT FOR BROWSER END */

	override get type(): AttributeTypes {
		return this.#type;
	}

	/** tag name / 标签名 */
	get tag(): string {
		return this.#tag;
	}

	/** whether the quotes are balanced / 引号是否匹配 */
	get balanced(): boolean {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/* NOT FOR BROWSER */

	set balanced(value) {
		if (value) {
			this.close();
		}
	}

	/** attribute value / 属性值 */
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
			e.suggestions = [{range: [e.endIndex, e.endIndex], text: this.#quotes[0]!, desc: 'close'}];
			errors.push(e);
		}
		const attrs = extAttrs[tag],
			attrs2 = htmlAttrs[tag],
			{length} = this.toString();
		if (
			!attrs?.has(name)
			&& !attrs2?.has(name)
			// 不是未定义的扩展标签或包含嵌入的HTML标签
			&& (type === 'ext-attr' ? attrs || attrs2 : !/\{\{[^{]+\}\}/u.test(name))
			&& (
				type === 'ext-attr' && !attrs2
				|| !/^(?:xmlns:[\w:.-]+|data-(?!ooui|mw|parsoid)[^:]*)$/u.test(name)
				&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
			)
		) {
			const e = generateForChild(firstChild, rect, 'illegal-attr', 'illegal attribute name');
			e.suggestions = [{desc: 'remove', range: [start, start + length], text: ''}];
			errors.push(e);
		} else if (obsoleteAttrs[tag]?.has(name)) {
			errors.push(
				generateForChild(
					firstChild,
					rect,
					'obsolete-attr',
					'obsolete attribute',
					'warning',
				),
			);
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			errors.push(generateForChild(lastChild, rect, 'insecure-style', 'insecure style'));
		} else if (name === 'tabindex' && typeof value === 'string' && value !== '0') {
			const e = generateForChild(lastChild, rect, 'illegal-attr', 'nonzero tabindex');
			e.suggestions = [
				{desc: 'remove', range: [start, start + length], text: ''},
				{desc: '0 tabindex', range: [e.startIndex, e.endIndex], text: '0'},
			];
			errors.push(e);
		}
		return errors;
	}

	/**
	 * Get the attribute value
	 *
	 * 获取属性值
	 */
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

	/**
	 * Escape `=`
	 *
	 * 转义等号
	 */
	escape(): void {
		this.#equal = '{{=}}';
	}

	/**
	 * Close the quote
	 *
	 * 闭合引号
	 */
	close(): void {
		const [opening] = this.#quotes;
		if (opening) {
			this.#quotes[1] = opening;
		}
	}

	/**
	 * Set the attribute value
	 *
	 * 设置属性值
	 * @param value attribute value / 属性值
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
			this.#quotes = [`'`, `'`] as const;
		} else if (value.includes(`'`) || !this.#quotes[0]) {
			this.#quotes = ['"', '"'] as const;
		} else {
			this.close();
		}
	}

	/**
	 * Rename the attribute
	 *
	 * 修改属性名
	 * @param key new attribute name / 新属性名
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
