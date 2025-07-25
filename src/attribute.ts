import {generateForChild, provideValues} from '../util/lint';
import {
	removeComment,
	trimLc,
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
import type {
	LintError,
	Config,
	AST,
} from '../base';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {cssLSP, EmbeddedCSSDocument} from '../lib/document';
import {fixedToken} from '../mixin/fixed';
import {cached} from '../mixin/cached';

declare interface CSSNode {
	offset: number;
	length: number;
	getText(): string;
}
declare interface Declaration extends CSSNode {
	property: CSSNode;
	value: CSSNode;
}
declare interface RuleSet {
	declarations: {
		children?: Declaration[];
	};
}
declare interface StyleSheet extends CSSNode {
	children: [RuleSet];
}

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3},
	ariaAttrs = new Set(['aria-describedby', 'aria-flowto', 'aria-labelledby', 'aria-owns']);

/* NOT FOR BROWSER END */

declare type Child = AtomToken | AttributeToken | undefined;
export type AttributeTypes = 'ext-attr' | 'html-attr' | 'table-attr';

const insecureStyle =
	/expression|(?:accelerator|-o-link(?:-source)?|-o-replace)\s*:|(?:url|src|image(?:-set)?)\s*\(|attr\s*\([^)]+[\s,]url/u,
	evil = /(?:^|\s|\*\/)(?:javascript|vbscript)(?:\W|$)/iu,
	complexTypes = new Set(['ext', 'arg', 'magic-word', 'template']),
	urlAttrs = new Set([
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
	]);

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
			|| tag === 'img' && key === 'src' && value?.includes('{{')
		) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes, 'heading', 'html', 'table', 'hr', 'list'],
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
		this.setAttribute('name', trimLc(removeComment(key)));
	}

	/** @private */
	override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, BuildMethod.String);
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.setAttribute('name', trimLc(this.firstChild.text()));
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

	/**
	 * 判定无效的属性名或值
	 * @param start 起始位置
	 * @param rect 位置
	 */
	#lint(): boolean;
	#lint(start: number, rect: BoundingRect): LintError | false;
	#lint(start?: number, rect?: BoundingRect): LintError | boolean {
		const {firstChild, lastChild, type, name, tag, parentNode} = this,
			simple = !lastChild.childNodes.some(({type: t}) => complexTypes.has(t)),
			value = this.getValue(),
			attrs = extAttrs[tag],
			attrs2 = htmlAttrs[tag],
			{length} = this.toString();
		let rule: LintError.Rule = 'illegal-attr';
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
			|| (name === 'itemtype' || name === 'itemid' || name === 'itemref')
			&& !parentNode?.hasAttr('itemscope')
		) {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			const s = Parser.lintConfig.getSeverity(rule, 'unknown');
			if (s) {
				const e = generateForChild(firstChild, rect!, rule, 'illegal attribute name', s);
				e.suggestions = [{desc: 'remove', range: [start, start + length], text: ''}];
				return e;
			}
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			rule = 'insecure-style';
			const s = Parser.lintConfig.getSeverity(rule);
			return s && generateForChild(lastChild, rect!, rule, 'insecure style', s);
		} else if (name === 'tabindex' && typeof value === 'string' && value !== '0') {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			const s = Parser.lintConfig.getSeverity(rule, 'tabindex');
			if (s) {
				const e = generateForChild(lastChild, rect!, rule, 'nonzero tabindex', s);
				e.suggestions = [
					{desc: 'remove', range: [start, start + length], text: ''},
					{desc: '0 tabindex', range: [e.startIndex, e.endIndex], text: '0'},
				];
				return e;
			}
		} else if (simple && type !== 'ext-attr') {
			const data = provideValues(tag, name),
				v = String(value).toLowerCase();
			if (data.length > 0 && data.every(n => n !== v)) {
				/* PRINT ONLY */

				if (start === undefined) {
					return true;
				}

				/* PRINT ONLY END */

				const s = Parser.lintConfig.getSeverity(rule, 'value');
				return s && generateForChild(lastChild, rect!, rule, 'illegal attribute value', s);
			}
		} else if (
			typeof value === 'string' && (
				(/^xmlns:[\w:.-]+$/u.test(name) || urlAttrs.has(name)) && evil.test(value)
				|| simple
				&& (name === 'href' || tag === 'img' && name === 'src')
				&& !new RegExp(String.raw`^(?:${this.getAttribute('config').protocol}|//)\S+$`, 'iu')
					.test(value)
			)
		) {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			const s = Parser.lintConfig.getSeverity(rule, 'value');
			return s && generateForChild(lastChild, rect!, rule, 'illegal attribute value', s);
		}
		return false;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{balanced, firstChild, lastChild, name, tag} = this,
			rect = new BoundingRect(this, start),
			rules = ['unclosed-quote', 'obsolete-attr'] as const,
			s = rules.map(rule => Parser.lintConfig.getSeverity(rule, name));
		if (s[0] && !balanced) {
			const e = generateForChild(lastChild, rect, rules[0], Parser.msg('unclosed $1', 'quotes'), s[0]);
			e.startIndex--;
			e.startCol--;
			e.suggestions = [{desc: 'close', range: [e.endIndex, e.endIndex], text: this.#quotes[0]!}];
			errors.push(e);
		}
		const e = this.#lint(start, rect);
		if (e) {
			errors.push(e);
		}
		if (s[1] && obsoleteAttrs[tag]?.has(name)) {
			errors.push(generateForChild(firstChild, rect, rules[1], 'obsolete attribute', s[1]));
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

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: escape(this.#equal) + quoteStart, post: quoteEnd}) : super.print();
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['tag'] = this.tag;
		return json;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [AtomToken, Token],
			k = key.toString(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new AttributeToken(this.type, this.tag, k, this.#equal, '', this.#quotes, config);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			return token;
		});
	}

	override escape(): void {
		this.#equal = '{{=}}';
		this.lastChild.escape();
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
		}
		const {type, lastChild} = this;
		if (type === 'ext-attr' && value.includes('>')) {
			throw new RangeError('Attributes of an extension tag cannot contain ">"!');
		} else if (value.includes('"') && value.includes(`'`)) {
			throw new RangeError('Attribute values cannot contain single and double quotes simultaneously!');
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(value, this.getAttribute('include'), stages[type] + 1, config);
		lastChild.safeReplaceChildren(childNodes);
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
		this.firstChild.safeReplaceChildren(childNodes);
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {type, name, tag, lastChild} = this;
		if (type === 'ext-attr' && extAttrs[tag]?.has(name) || this.#lint()) {
			return '';
		}
		const value = lastChild.toHtmlInternal().trim();
		if (name === 'id' && !value) {
			return '';
		}
		const sanitized = ariaAttrs.has(name)
			? value.split(/\s+/u).filter(Boolean).map(v => sanitizeAttr(v, true)).join(' ')
			: sanitizeAttr(value, name === 'id');
		return `${name}="${sanitized}"`;
	}

	/**
	 * Get or set the value of a style property
	 *
	 * 获取或设置某一样式属性的值
	 * @param key style property / 样式属性
	 * @param value style property value / 样式属性值
	 * @throws `Error` 不是style属性
	 * @throws `Error` 复杂的style属性
	 * @throws `Error` 无CSS语言服务
	 * @since v1.17.1
	 */
	css(key: string, value?: string): string | undefined {
		const {name, lastChild} = this;
		if (name !== 'style') {
			throw new Error('Not a style attribute!');
		} else if (lastChild.length !== 1 || lastChild.firstChild!.type !== 'text') {
			throw new Error('Complex style attribute!');
		} else if (!cssLSP) {
			throw new Error('CSS language service is not available!');
		}
		const doc = new EmbeddedCSSDocument(this.getRootNode(), lastChild),
			styleSheet = doc.styleSheet as StyleSheet,
			{children: [{declarations}]} = styleSheet,
			declaration = declarations.children?.filter(({property}) => property.getText() === key) ?? [];
		if (value === undefined) {
			return declaration.at(-1)?.value.getText();
		} else if (typeof value === 'number') {
			value = String(value);
		}
		const style = styleSheet.getText().slice(0, -1);
		if (!value) {
			if (declaration.length === declarations.children?.length) {
				this.setValue('');
			} else if (declaration.length > 0) {
				let output = '',
					start = doc.pre.length;
				for (const {offset, length} of declaration) {
					output += style.slice(start, offset);
					start = offset + length;
				}
				output += style.slice(start);
				this.setValue(output.replace(/^\s*;\s*|;\s*(?=;)/gu, ''));
			}
			return undefined;
		}
		const hasQuote = value.includes('"');
		if (this.#quotes[0] && value.includes(this.#quotes[0]) || hasQuote && value.includes(`'`)) {
			const quote = this.#quotes[0] || '"';
			throw new RangeError(
				`Please consider replacing \`${quote}\` with \`${quote === '"' ? `'` : '"'}\`!`,
			);
		} else if (declaration.length > 0) {
			const {value: {offset, length}} = declaration.at(-1)!;
			this.setValue(style.slice(doc.pre.length, offset) + value + style.slice(offset + length));
		} else {
			this.setValue(`${style.slice(doc.pre.length)}${/;\s*$/u.test(style) ? '' : '; '}${key}: ${value}`);
		}
		return undefined;
	}
}

classes['AttributeToken'] = __filename;
