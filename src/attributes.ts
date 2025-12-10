import {generateForSelf, generateForChild, fixByRemove, fixByOpen} from '../util/lint';
import {
	removeComment,
	trimLc,

	/* NOT FOR BROWSER */

	normalizeSpace,
	text,
} from '../util/string';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {Config, LintError} from '../base';
import type {ExtToken, HtmlToken, SyntaxToken, TdToken} from '../internal';
import type {AttributeTypes} from './attribute';
import type {TableTokens} from './table/index';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {clone} from '../mixin/clone';
import {cached} from '../mixin/cached';

const stages = {'ext-attrs': 0, 'html-attrs': 2, 'table-attrs': 3};

/* NOT FOR BROWSER END */

declare type AttributesTypes = `${AttributeTypes}s`;
declare type AttributeDirty = `${AttributeTypes}-dirty`;

/**
 * 将属性类型转换为单属性类型
 * @param type 属性类型
 */
export const toAttributeType = (type: AttributesTypes): AttributeTypes =>
	type.slice(0, -1) as AttributeTypes;

/**
 * 将属性类型转换为无效属性类型
 * @param type 属性类型
 */
const toDirty = (type: AttributesTypes): AttributeDirty => `${toAttributeType(type)}-dirty`;

const wordRegex = /* #__PURE__ */ ((): RegExp => {
	try {
		// eslint-disable-next-line prefer-regex-literals
		return new RegExp(String.raw`[\p{L}\p{N}]`, 'u');
	} catch /* istanbul ignore next */ {
		return /[^\W_]/u;
	}
})();

/**
 * attributes of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: (AtomToken|AttributeToken)[]}`
 */
export abstract class AttributesToken extends Token {
	declare readonly name: string;
	readonly #type;

	/* NOT FOR BROWSER */

	#classList: Set<string> | undefined;

	/* NOT FOR BROWSER END */

	declare readonly childNodes: readonly (AtomToken | AttributeToken)[];
	abstract override get firstChild(): AtomToken | AttributeToken | undefined;
	abstract override get lastChild(): AtomToken | AttributeToken | undefined;
	abstract override get parentNode(): ExtToken | HtmlToken | TableTokens | undefined;
	abstract override get previousSibling(): SyntaxToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): (AtomToken | AttributeToken)[];
	abstract override get firstElementChild(): AtomToken | AttributeToken | undefined;
	abstract override get lastElementChild(): AtomToken | AttributeToken | undefined;
	abstract override get parentElement(): ExtToken | HtmlToken | TableTokens | undefined;
	abstract override get previousElementSibling(): SyntaxToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): AttributesTypes {
		return this.#type;
	}

	/* NOT FOR BROWSER */

	/** all attributes / 全部属性 */
	get attributes(): Record<string, string | true> {
		return this.getAttrs();
	}

	set attributes(attrs) {
		this.replaceChildren();
		this.setAttr(attrs);
	}

	/** class attribute in string / 以字符串表示的class属性 */
	get className(): string {
		const attr = this.getAttr('class');
		return typeof attr === 'string' ? attr : '';
	}

	set className(className) {
		this.setAttr('class', className || false);
	}

	/** class attribute in Set / 以Set表示的class属性 */
	get classList(): Set<string> {
		if (!this.#classList) {
			this.#classList = new Set(this.className.split(/\s/u));

			/**
			 * 更新classList
			 * @param prop 方法名
			 */
			const factory = (prop: 'add' | 'delete' | 'clear'): PropertyDescriptor => ({
				value: /** @ignore */ (...args: unknown[]): unknown => {
					const result = Set.prototype[prop as 'add'].apply(this.#classList, args as [unknown]);
					this.setAttr('class', [...this.#classList!].join(' '));
					return result;
				},
			});
			Object.defineProperties(this.#classList, {
				add: factory('add'),
				delete: factory('delete'),
				clear: factory('clear'),
			});
		}
		return this.#classList;
	}

	/** id attribute / id属性 */
	get id(): string {
		const attr = this.getAttr('id');
		return typeof attr === 'string' ? attr : '';
	}

	set id(id) {
		this.setAttr('id', id || false);
	}

	/** whether to contain invalid attributes / 是否含有无效属性 */
	get sanitized(): boolean {
		return this.childNodes.filter(child => child instanceof AtomToken && child.text().trim()).length === 0;
	}

	set sanitized(sanitized) {
		if (sanitized) {
			this.sanitize();
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param attr 标签属性
	 * @param type 标签类型
	 * @param name 标签名
	 */
	constructor(attr: string | undefined, type: AttributesTypes, name: string, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: ':', AttributeToken: ':',
		});
		this.#type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = /([^\s/](?:(?!\0\d+~\x7F)[^\s/=])*)(?:((?:\s(?:\s|\0\d+[cn]\x7F)*)?(?:=|\0\d+~\x7F)(?:\s|\0\d+[cn]\x7F)*)(?:(["'])([\s\S]*?)(\3|$)|(\S*)))?/gu;
			let out = '',
				mt = regex.exec(attr) as RegExpExecArray & {1: string} | null,
				lastIndex = 0;
			const insertDirty = /** 插入无效属性 */ (): void => {
				if (out) {
					super.insertAt(new AtomToken(out, toDirty(type), config, accum, {
						[`Stage-${stages[type]}`]: ':',
					}));
					out = '';
				}
			};
			while (mt) {
				const {index, 0: full, 1: key, 2: equal, 3: quoteStart, 4: quoted, 5: quoteEnd, 6: unquoted} = mt;
				out += attr.slice(lastIndex, index);
				if (/^(?:[\w:]|\0\d+t\x7F)(?:[\w:.-]|\0\d+t\x7F)*$/u.test(removeComment(key).trim())) {
					const value = quoted ?? unquoted,
						quotes = [quoteStart, quoteEnd] as [string?, string?],
						// @ts-expect-error abstract class
						token: AttributeToken = new AttributeToken(
							toAttributeType(type),
							name,
							key,
							quotes,
							config,
							equal,
							value,
							accum,
						);
					insertDirty();
					super.insertAt(token);
				} else {
					out += full;
				}
				({lastIndex} = regex);
				mt = regex.exec(attr) as RegExpExecArray & {1: string} | null;
			}
			out += attr.slice(lastIndex);
			insertDirty();
		}
	}

	/** @private */
	override afterBuild(): void {
		const {parentNode} = this;
		if (parentNode?.is<TdToken>('td')) {
			this.setAttribute('name', parentNode.subtype);
		}
		super.afterBuild();
	}

	/**
	 * Get all AttributeTokens with the specified attribute name
	 *
	 * 所有指定属性名的AttributeToken
	 * @param key attribute name / 属性名
	 */
	getAttrTokens(key?: string): AttributeToken[] {
		return this.childNodes.filter(
			(child): child is AttributeToken =>
				child instanceof AttributeToken && (!key || child.name === trimLc(key)),
		);
	}

	/**
	 * Check if the token has a certain attribute
	 *
	 * 是否具有某属性
	 * @param key attribute name / 属性键
	 */
	hasAttr(key: string): boolean {
		return this.getAttrTokens(key).length > 0;
	}

	/**
	 * Get the last AttributeToken with the specified attribute name
	 *
	 * 指定属性名的最后一个AttributeToken
	 * @param key attribute name / 属性名
	 */
	getAttrToken(key: string): AttributeToken | undefined {
		LINT: {
			const tokens = this.getAttrTokens(key);
			return tokens[tokens.length - 1];
		}
	}

	/**
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | true | undefined {
		LINT: return this.getAttrToken(key)?.getValue();
	}

	/** 是否位于闭合标签内 */
	#lint(): boolean {
		const {parentNode} = this;
		return parentNode?.type === 'html' && parentNode.closing && this.text().trim() !== '';
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				{parentNode, childNodes} = this,
				attrs = new Map<string, AttributeToken[]>(),
				duplicated = new Set<string>(),
				rect = new BoundingRect(this, start),
				rules = ['no-ignored', 'no-duplicate'] as const,
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				s = ['closingTag', 'invalidAttributes', 'nonWordAttributes']
					.map(k => lintConfig.getSeverity(rules[0], k));
			if (s[0] && this.#lint()) {
				const e = generateForSelf(this, rect, rules[0], 'attributes-of-closing-tag', s[0]);
				if (computeEditInfo) {
					const index = parentNode!.getAbsoluteIndex();
					e.suggestions = [
						fixByRemove(e),
						fixByOpen(index),
					];
				}
				errors.push(e);
			}
			for (const attr of childNodes) {
				if (attr instanceof AttributeToken) {
					const {name} = attr;
					if (attrs.has(name)) {
						duplicated.add(name);
						attrs.get(name)!.push(attr);
					} else {
						attrs.set(name, [attr]);
					}
				} else {
					const str = attr.text().trim(),
						severity = s[wordRegex.test(str) ? 1 : 2];
					if (str && severity) {
						const e = generateForChild(attr, rect, rules[0], 'invalid-attribute', severity);
						if (computeEditInfo) {
							e.suggestions = [fixByRemove(e, 0, ' ')];
						}
						errors.push(e);
					}
				}
			}
			const severity = lintConfig.getSeverity(rules[1], 'attribute');
			if (severity && duplicated.size > 0) {
				for (const key of duplicated) {
					const pairs = attrs.get(key)!.map(attr => {
						const value = attr.getValue();
						return [attr, value === true ? '' : value] as const;
					});
					Array.prototype.push.apply(
						errors,
						pairs.map(([attr, value], i) => {
							const e = generateForChild(
								attr,
								rect,
								rules[1],
								Parser.msg('duplicate-attribute', key),
								severity,
							);
							if (computeEditInfo || fix) {
								const remove = fixByRemove(e);
								if (!value || pairs.slice(0, i).some(([, v]) => v === value)) {
									e.fix = remove;
								} else if (computeEditInfo) {
									e.suggestions = [remove];
								}
							}
							return e;
						}),
					);
				}
			}
			return errors;
		}
	}

	override escape(): void {
		LSP: {
			if (this.type !== 'ext-attrs') {
				super.escape();
			}
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* NOT FOR BROWSER */

		if (key === 'padding') {
			return this.#leadingSpace(super.toString()).length as TokenAttribute<T>;
		}

		/* NOT FOR BROWSER END */

		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		PRINT: return this.toString()
			? `<span class="wpb-${this.type}${this.#lint() ? ' wpb-invalid' : ''}">${
				this.childNodes.map(child => child.print(
					child instanceof AtomToken ? {class: child.toString().trim() && 'attr-dirty'} : undefined,
				)).join('')
			}</span>`
			: '';
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * Sanitize invalid attributes
	 *
	 * 清理无效属性
	 */
	sanitize(): void {
		require('../addon/attribute');
		this.sanitize();
	}

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new AttributesToken(undefined, this.type, this.name, this.getAttribute('config'));
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` 标签不匹配
	 */
	override insertAt<T extends AtomToken | AttributeToken>(token: T, i = this.length): T {
		if (!(token instanceof AttributeToken)) {
			if (!Shadow.running && token.toString().trim()) {
				this.constructorError('can only insert AttributeToken');
			}
			return super.insertAt(token, i);
		}
		const {type, name, length} = this;
		if (token.type !== type.slice(0, -1) || token.tag !== name) {
			throw new RangeError(`The AttributeToken to be inserted can only be used for <${token.tag}> tag!`);
		} else if (i === length) {
			const {lastChild} = this;
			if (lastChild instanceof AttributeToken) {
				lastChild.close();
			}
		} else {
			token.close();
		}
		if (this.isInside('parameter')) {
			token.escape();
		}
		super.insertAt(token, i);
		const {previousVisibleSibling, nextVisibleSibling} = token,
			dirtyType = toDirty(type),
			config = this.getAttribute('config'),
			acceptable = {[`Stage-${stages[type]}`]: ':'};
		if (nextVisibleSibling && !/^\s/u.test(nextVisibleSibling.toString())) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', dirtyType, config, [], acceptable)), i + 1);
		}
		if (previousVisibleSibling && !/\s$/u.test(previousVisibleSibling.toString())) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', dirtyType, config, [], acceptable)), i);
		}
		return token;
	}

	/**
	 * Set the attribute
	 *
	 * 设置指定属性
	 * @param key attribute name / 属性键
	 * @param value attribute value / 属性值
	 * @param prop attribute object / 属性对象
	 * @throws `RangeError` 扩展标签属性不能包含">"
	 */
	setAttr(key: string, value: string | boolean): void;
	setAttr(prop: Record<string, string | boolean>): void;
	setAttr(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
		require('../addon/attribute');
		this.setAttr(keyOrProp as string, value!);
	}

	/**
	 * Get all attribute names
	 *
	 * 获取全部的属性名
	 */
	getAttrNames(): Set<string> {
		return new Set(this.getAttrTokens().map(({name}) => name));
	}

	/**
	 * Get all attributes
	 *
	 * 获取全部属性
	 */
	getAttrs(): Record<string, string | true> {
		return Object.fromEntries(this.getAttrTokens().map(({name, value}) => [name, value]));
	}

	/**
	 * Remove an attribute
	 *
	 * 移除指定属性
	 * @param key attribute name / 属性键
	 */
	removeAttr(key: string): void {
		for (const attr of this.getAttrTokens(key)) {
			attr.remove();
		}
	}

	/**
	 * Toggle the specified attribute
	 *
	 * 开关指定属性
	 * @param key attribute name / 属性键
	 * @param force whether to force enabling or disabling / 强制开启或关闭
	 * @throws `RangeError` 不为Boolean类型的属性值
	 */
	toggleAttr(key: string, force?: boolean): void {
		require('../addon/attribute');
		this.toggleAttr(key, force);
	}

	/**
	 * 生成引导空格
	 * @param str 属性字符串
	 */
	#leadingSpace(str: string): string {
		const {type} = this,
			leadingRegex = {'ext-attrs': /^\s/u, 'html-attrs': /^[/\s]/u};
		return str && type !== 'table-attrs' && !leadingRegex[type].test(str) ? ' ' : '';
	}

	/** @private */
	override toString(skip?: boolean): string {
		if (this.type === 'table-attrs') {
			normalizeSpace(this);
		}
		const str = super.toString(skip);
		return this.#leadingSpace(str) + str;
	}

	/** @private */
	override text(): string {
		if (this.type === 'table-attrs') {
			normalizeSpace(this);
		}
		const str = text(this.childNodes.filter(child => child instanceof AttributeToken), ' ');
		return this.#leadingSpace(str) + str;
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const map = new Map(
				this.childNodes.filter(child => child instanceof AttributeToken).map(child => [child.name, child]),
			),
			output = map.size === 0 ? '' : html([...map.values()], ' ', {removeBlank: true});
		return output && ` ${output}`;
	}

	/**
	 * Get the value of a style property
	 *
	 * 获取某一样式属性的值
	 * @param key style property / 样式属性
	 * @param value style property value / 样式属性值
	 */
	css(key: string, value?: string): string | undefined {
		require('../addon/attribute');
		return this.css(key, value);
	}
}

classes['AttributesToken'] = __filename;
