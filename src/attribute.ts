import {provideValues} from '../util/lint';
import {
	removeComment,
	trimLc,

	/* NOT FOR BROWSER */

	sanitizeAttr,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import {commonHtmlAttrs, extAttrs, htmlAttrs} from '../util/sharable';
import {Token} from './index';
import {AtomToken} from './atom';
import type {
	Config,
	TokenTypes,
} from '../base';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {cached} from '../mixin/cached';

export const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3};
const ariaAttrs = new Set(['aria-describedby', 'aria-flowto', 'aria-labelledby', 'aria-owns']);

/* NOT FOR BROWSER END */

export type AttributeTypes = 'ext-attr'
	| 'html-attr'
	| 'table-attr';

const insecureStyle =
		/expression|(?:accelerator|-o-link(?:-source)?|-o-replace)\s*:|(?:url|src|image(?:-set)?)\s*\(|attr\s*\((?:(?!attr\s*\()[^)])+[\s,]url/u,
	evil = /(?:^|\s|\*\/)(?:java|vb)script(?:\W|$)/iu,
	complexTypes = new Set<TokenTypes | 'text'>(['ext', 'arg', 'magic-word', 'template']),
	itemAttrs = new Set(['itemtype', 'itemid', 'itemref']),
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
export abstract class AttributeToken extends Token {
	declare readonly name: string;
	#type;
	#tag;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [
		AtomToken,
		Token
		,
	];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token
	;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): AtomToken | this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): AttributeTypes {
		return this.#type;
	}

	/** tag name / 标签名 */
	get tag(): string {
		return this.#tag;
	}

	/**
	 * @param type 标签类型
	 * @param tag 标签名
	 * @param key 属性名
	 * @param quotes 引号
	 * @param equal 等号
	 * @param value 属性值
	 */
	constructor(
		type: AttributeTypes,
		tag: string,
		key: string,
		quotes: readonly [string?, string?],
		config: Config,
		equal = '',
		value?: string,
		accum: Token[] = [],
	) {
		const keyToken =
			new AtomToken(
				key,
				'attr-key',
				config,
				accum,
				type === 'ext-attr' ? {AstText: ':'} : {'Stage-2': ':', '!ExtToken': '', '!HeadingToken': ''},
			);
		let valueToken: Token
		;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
				[`Stage-${stages[type]}`]: ':', ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', MAX_STAGE - 1);
		} else if (
			tag === 'gallery' && key === 'caption'
			|| tag === 'ref' && key === 'details'
		) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
				'Stage-2': ':',
				'!HeadingToken': '',
				LinkToken: ':',
				FileToken: ':',
				CategoryToken: ':',
				QuoteToken: ':',
				MagicLinkToken: ':',
				ConverterToken: ':',
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 1);
		} else {
			valueToken =
				new AtomToken(value, 'attr-value', config, accum, {
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

	/** 获取name */
	#getName(): string {
		return trimLc(this.firstChild.text());
	}

	/** 更新name */
	#setName(): void {
		this.setAttribute('name', this.#getName());
	}

	/** @private */
	override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, BuildMethod.String);
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.#setName();
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.toString(skip, this.#equal + quoteStart) + quoteEnd : this.firstChild.toString(skip);
	}

	/** @private */
	override text(): string {
		// eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
		const {lastChild, name = this.#getName()} = this;
		return this.#equal ? `${name}${this.#equal.trim()}"${lastChild.text()}"` : name;
	}

	/** @private */
	override getGaps(): number {
		return this.#equal ? 1 : 0;
	}

	/**
	 * 判定无效的属性名或值
	 */
	#lint(): false | 1 | 2 {
		const {lastChild, type, name, tag, parentNode} = this,
			// eslint-disable-next-line unicorn/no-declarations-before-early-exit
			simple = !lastChild.childNodes.some(({type: t}) => complexTypes.has(t)),
			value = this.getValue(),
			attrs = extAttrs[tag],
			attrs2 = htmlAttrs[tag];
		if (
			!attrs?.has(name)
			&& !attrs2?.has(name)
			// 已知定义的扩展标签或不包含嵌入的HTML标签
			&& (type === 'ext-attr' ? attrs || attrs2 : !/\{\{[^{]+\}\}/u.test(name))
			&& (
				// 不支持通用HTML属性的扩展标签
				type === 'ext-attr' && !attrs2
				// 或非通用HTML属性
				|| !/^(?:xmlns:[\w:.-]+|data-(?!ooui|mw|parsoid)[^:_]*)$/u.test(name)
				&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
			)
			|| itemAttrs.has(name) && !parentNode?.hasAttr('itemscope')
		) {
			/* PRINT ONLY */

			return 2;
		} else if (name === 'style' && insecureStyle.test(value)) {
			/* PRINT ONLY */

			return 1;
		} else if (name === 'tabindex' && value !== '0') {
			/* PRINT ONLY */

			return 2;
		}
		let valueIssue = (/^xmlns:[\w:.-]+$/u.test(name) || urlAttrs.has(name)) && evil.test(value)
			|| simple
			&& (name === 'href' || type === 'ext-attr' && tag === 'img' && name === 'src')
			&& !new RegExp(String.raw`^(?:${this.getAttribute('config').protocol}|//)\S+$`, 'iu')
				.test(value);
		if (simple && !valueIssue && type !== 'ext-attr') {
			const data = provideValues(tag, name),
				v = value.toLowerCase();
			if (data.length > 0 && data.every(n => n !== v)) {
				valueIssue = true;
			}
		}
		// eslint-disable-next-line unicorn/prefer-ternary
		if (valueIssue) {
			/* PRINT ONLY */

			return 2;
		}
		return false;
	}

	/**
	 * Get the attribute value
	 *
	 * 获取属性值
	 */
	getValue(): string {
		return this.#equal ? this.lastChild.text().replace(/[\t\r\n ]+/gu, ' ').trim() : '';
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* NOT FOR BROWSER */

		// eslint-disable-next-line unicorn/prefer-ternary
		if (key === 'quotes') {
			return this.#quotes as TokenAttribute<T>;
		}

		/* NOT FOR BROWSER END */

		return super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'equal') {
			this.#equal = value && (this.#equal || value) as TokenAttribute<'equal'>;
		} else if (key === 'quotes') {
			this.#quotes = value as TokenAttribute<'quotes'>;
		} else {
			super.setAttribute(key, value);
		}
	}

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [AtomToken, Token],
			k = key.toString();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new AttributeToken(
				this.type,
				this.tag,
				k,
				this.#quotes,
				this.getAttribute('config'),
				this.#equal,
				undefined,
			);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			return token;
		});
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
	 * @throws `RangeError` if the attribute of an extension tag contains `>` or the value contains both `"` and `'`
	 */
	setValue(value: string): void {
		require('../addon/attribute');
		this.setValue(value);
	}

	/** @private */
	asHtmlAttr(): void {
		this.#type = 'html-attr';
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {type, name, tag, lastChild} = this;
		if (type === 'ext-attr' && extAttrs[tag]?.has(name)) {
			return '';
		}
		const linted = this.#lint();
		if (linted) {
			return linted === 1 ? 'style="/* insecure input */"' : '';
		}
		const value = lastChild.toHtmlInternal().trim();
		if (name === 'id' && !value) {
			return '';
		}
		const sanitized = ariaAttrs.has(name)
			? value.split(/\s+/u).filter(v => v !== '').map(v => sanitizeAttr(v, true))
				.join(' ')
			: sanitizeAttr(value, name === 'id');
		return `${name}="${sanitized}"`;
	}
}
