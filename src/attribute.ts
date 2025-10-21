import {generateForChild, provideValues, fixBy, fixByClose, fixByRemove} from '../util/lint';
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
import type {LintConfiguration} from '../lib/lintConfig';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER ONLY */

import {cssLSP, EmbeddedCSSDocument} from '../lib/document';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
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

	/** tag name / 标签名 */
	get tag(): string {
		return this.#tag;
	}

	/** whether the quotes are balanced / 引号是否匹配 */
	get balanced(): boolean {
		LINT: return !this.#equal || this.#quotes[0] === this.#quotes[1]; // eslint-disable-line no-unused-labels
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
			|| tag === 'ref' && key === 'details'
			|| tag === 'choose' && (key === 'before' || key === 'after')
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

	/** 更新name */
	#setName(): void {
		this.setAttribute('name', trimLc(this.firstChild.text()));
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

		/* NOT FOR BROWSER */

		const /** @implements */ attributeListener: AstListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.#setName();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], attributeListener);
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
		let rule: LintError.Rule = 'illegal-attr',
			lintConfig: LintConfiguration,
			computeEditInfo: boolean | undefined;
		LINT: { // eslint-disable-line no-unused-labels
			({lintConfig} = Parser);
			({computeEditInfo} = lintConfig);
		}
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

			LINT: { // eslint-disable-line no-unused-labels
				const s = lintConfig.getSeverity(rule, 'unknown');
				if (s) {
					const e = generateForChild(firstChild, rect!, rule, 'illegal-attribute-name', s);
					if (computeEditInfo) {
						e.suggestions = [fixByRemove(start, length)];
					}
					return e;
				}
			}
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			LINT: { // eslint-disable-line no-unused-labels
				rule = 'insecure-style';
				const s = lintConfig.getSeverity(rule);
				return s && generateForChild(lastChild, rect!, rule, 'insecure-style', s);
			}
		} else if (name === 'tabindex' && typeof value === 'string' && value !== '0') {
			/* PRINT ONLY */

			if (start === undefined) {
				return true;
			}

			/* PRINT ONLY END */

			LINT: { // eslint-disable-line no-unused-labels
				const s = lintConfig.getSeverity(rule, 'tabindex');
				if (s) {
					const e = generateForChild(lastChild, rect!, rule, 'nonzero-tabindex', s);
					if (computeEditInfo) {
						e.suggestions = [
							fixByRemove(start, length),
							fixBy(e, '0 tabindex', '0'),
						];
					}
					return e;
				}
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

			LINT: { // eslint-disable-line no-unused-labels
				const s = lintConfig.getSeverity(rule, 'value');
				return s && generateForChild(lastChild, rect!, rule, 'illegal-attribute-value', s);
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

				LINT: { // eslint-disable-line no-unused-labels
					const s = lintConfig.getSeverity(rule, 'value');
					return s && generateForChild(lastChild, rect!, rule, 'illegal-attribute-value', s);
				}
			}
		}
		return false;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{balanced, firstChild, lastChild, name, tag} = this,
				rect = new BoundingRect(this, start),
				rules = ['unclosed-quote', 'obsolete-attr'] as const,
				{lintConfig} = Parser,
				s = rules.map(rule => lintConfig.getSeverity(rule, name));
			if (s[0] && !balanced) {
				const e = generateForChild(lastChild, rect, rules[0], 'unclosed-quotes', s[0]);
				e.startIndex--;
				e.startCol--;
				if (lintConfig.computeEditInfo) {
					e.suggestions = [fixByClose(e.endIndex, this.#quotes[0]!)];
				}
				errors.push(e);
			}
			const e = this.#lint(start, rect);
			if (e) {
				errors.push(e);
			}
			if (s[1] && obsoleteAttrs[tag]?.has(name)) {
				errors.push(generateForChild(firstChild, rect, rules[1], 'obsolete-attribute', s[1]));
			}

			/* NOT FOR BROWSER ONLY */

			const rule = 'invalid-css',
				sError = lintConfig.getSeverity(rule),
				sWarn = lintConfig.getSeverity(rule, 'warn');
			if (
				cssLSP
				&& (sError || sWarn)
				&& name === 'style'
				&& lastChild.length === 1 && lastChild.firstChild!.type === 'text'
			) {
				const root = this.getRootNode(),
					textDoc = new EmbeddedCSSDocument(root, lastChild);
				errors.push(
					...cssLSP.doValidation(textDoc, textDoc.styleSheet)
						.filter(
							({code, severity}) => code !== 'css-ruleorselectorexpected' && code !== 'emptyRules'
								&& (severity === 1 ? sError : sWarn),
						)
						.map(({range: {start: {line, character}, end}, message, severity, code}): LintError => ({
							code: code as string,
							rule,
							message,
							severity: (severity === 1 ? sError : sWarn) as LintError.Severity,
							startLine: line,
							startCol: character,
							startIndex: root.indexFromPos(line, character)!,
							endLine: end.line,
							endCol: end.character,
							endIndex: root.indexFromPos(end.line, end.character)!,
						})),
				);
			}

			/* NOT FOR BROWSER ONLY END */

			return errors;
		}
	}

	/**
	 * Get the attribute value
	 *
	 * 获取属性值
	 */
	getValue(): string | true {
		return this.#equal ? this.lastChild.text().trim() : this.type === 'ext-attr' || '';
	}

	override escape(): void {
		LSP: { // eslint-disable-line no-unused-labels
			this.#equal = '{{=}}';
			this.lastChild.escape();
		}
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
		LSP: { // eslint-disable-line no-unused-labels
			const json = super.json(undefined, start);
			json['tag'] = this.tag;
			return json;
		}
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [AtomToken, Token],
			k = key.toString();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new AttributeToken(
				this.type,
				this.tag,
				k,
				this.#equal,
				'',
				this.#quotes,
				this.getAttribute('config'),
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
		const {childNodes} = Parser.parseWithRef(value, this, stages[type] + 1);
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
		const {type, name, tag, firstChild} = this;
		if (name === 'title' || name === 'alt' && tag === 'img') {
			throw new Error(`${name} attribute cannot be renamed!`);
		}
		const {childNodes} = Parser.parseWithRef(key, this, stages[type] + 1);
		firstChild.safeReplaceChildren(childNodes);
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
	 * @since v1.17.1
	 * @throws `Error` 不是style属性
	 * @throws `Error` 复杂的style属性
	 * @throws `Error` 无CSS语言服务
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
