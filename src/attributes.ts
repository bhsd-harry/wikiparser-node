import {generateForSelf, generateForChild} from '../util/lint';
import {
	removeComment,

	/* NOT FOR BROWSER */

	normalizeSpace,
	text,
} from '../util/string';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {LintError} from '../base';
import type {ExtToken, HtmlToken, SyntaxToken} from '../internal';
import type {AttributeTypes} from './attribute';
import type {TableTokens} from './table/index';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';

const stages = {'ext-attrs': 0, 'html-attrs': 2, 'table-attrs': 3};

/* NOT FOR BROWSER END */

declare type AttributesTypes = `${AttributeTypes}s`;
declare type AttributeDirty = `${AttributeTypes}-dirty`;
declare type Child = AtomToken | AttributeToken;

/**
 * 将属性类型转换为单属性类型
 * @param type 属性类型
 */
const toAttributeType = (type: AttributesTypes): AttributeTypes => type.slice(0, -1) as AttributeTypes;

/**
 * 将属性类型转换为无效属性类型
 * @param type 属性类型
 */
const toDirty = (type: AttributesTypes): AttributeDirty => `${toAttributeType(type)}-dirty`;

let wordRegex: RegExp;
try {
	// eslint-disable-next-line prefer-regex-literals, es-x/no-regexp-unicode-property-escapes
	wordRegex = new RegExp(String.raw`[\p{L}\d]`, 'u');
} catch /* istanbul ignore next */ {
	wordRegex = /[^\W_]/u;
}

/**
 * attributes of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: (AtomToken|AttributeToken)[]}`
 */
export abstract class AttributesToken extends Token {
	declare readonly name: string;
	readonly #type;
	#classList: Set<string> | undefined;

	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get parentNode(): ExtToken | HtmlToken | TableTokens | undefined;
	abstract override get previousSibling(): SyntaxToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];
	abstract override get firstElementChild(): Child | undefined;
	abstract override get lastElementChild(): Child | undefined;
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
	constructor(
		attr: string | undefined,
		type: AttributesTypes,
		name: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
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
							equal,
							value,
							quotes,
							config,
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
		if (parentNode?.type === 'td' && parentNode.subtype === 'caption') {
			this.setAttribute('name', 'caption');
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
				child instanceof AttributeToken && (!key || child.name === key.toLowerCase().trim()),
		);
	}

	/**
	 * Get the last AttributeToken with the specified attribute name
	 *
	 * 指定属性名的最后一个AttributeToken
	 * @param key attribute name / 属性名
	 */
	getAttrToken(key: string): AttributeToken | undefined {
		const tokens = this.getAttrTokens(key);
		return tokens[tokens.length - 1];
	}

	/**
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | true | undefined {
		return this.getAttrToken(key)?.getValue();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{parentNode, childNodes} = this,
			attrs = new Map<string, AttributeToken[]>(),
			duplicated = new Set<string>(),
			rect = new BoundingRect(this, start);
		if (parentNode?.type === 'html' && parentNode.closing && this.text().trim()) {
			const e = generateForSelf(this, rect, 'no-ignored', 'attributes of a closing tag'),
				index = parentNode.getAbsoluteIndex();
			e.suggestions = [
				{desc: 'remove', range: [start, e.endIndex], text: ''},
				{desc: 'open', range: [index + 1, index + 2], text: ''},
			];
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
				const str = attr.text().trim();
				if (str) {
					const e = generateForChild(
						attr,
						rect,
						'no-ignored',
						'containing invalid attribute',
						wordRegex.test(str) ? 'error' : 'warning',
					);
					e.suggestions = [{desc: 'remove', range: [e.startIndex, e.endIndex], text: ' '}];
					errors.push(e);
				}
			}
		}
		if (duplicated.size > 0) {
			for (const key of duplicated) {
				const pairs = attrs.get(key)!.map(attr => {
					const value = attr.getValue();
					return [attr, value === true ? '' : value] as const;
				});
				errors.push(...pairs.map(([attr, value], i) => {
					const e = generateForChild(
							attr,
							rect,
							'no-duplicate',
							Parser.msg('duplicated $1 attribute', key),
						),
						remove: LintError.Fix = {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
					if (!value || pairs.slice(0, i).some(([, v]) => v === value)) {
						e.fix = remove;
					} else {
						e.suggestions = [remove];
					}
					return e;
				}));
			}
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return this.toString()
			? `<span class="wpb-${this.type}">${this.childNodes.map(child => child.print(
				child instanceof AtomToken ? {class: child.toString().trim() && 'attr-dirty'} : undefined,
			)).join('')}</span>`
			: '';
	}

	/* NOT FOR BROWSER */

	/**
	 * Sanitize invalid attributes
	 *
	 * 清理无效属性
	 */
	sanitize(): void {
		let dirty = false;
		for (let i = this.length - 1; i >= 0; i--) {
			const child = this.childNodes[i]!;
			if (child instanceof AtomToken && child.text().trim()) {
				dirty = true;
				this.removeAt(i);
			}
		}
		if (!Shadow.running && dirty) {
			Parser.warn('AttributesToken.sanitize will remove invalid attributes!');
		}
	}

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new AttributesToken(
				undefined,
				this.type,
				this.name,
				this.getAttribute('config'),
			) as this;
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` 标签不匹配
	 */
	override insertAt<T extends Child>(token: T, i = this.length): T {
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
		if (this.closest('parameter')) {
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
		if (typeof keyOrProp !== 'string') {
			for (const [key, val] of Object.entries(keyOrProp)) {
				this.setAttr(key, val);
			}
			return;
		}
		const {type, name} = this;
		if (type === 'ext-attrs' && typeof value === 'string' && value.includes('>')) {
			throw new RangeError('Attributes of an extension tag cannot contain ">"!');
		}
		const key = keyOrProp.toLowerCase().trim(),
			attr = this.getAttrToken(key);
		if (attr) {
			attr.setValue(value!);
			return;
		} else if (value === false) {
			return;
		}
		// @ts-expect-error abstract class
		const token = Shadow.run((): AttributeToken => new AttributeToken(
			toAttributeType(type),
			name,
			key,
			value === true ? '' : '=',
			value === true ? '' : value,
			['"', '"'],
			this.getAttribute('config'),
		));
		this.insertAt(token);
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
		key = key.toLowerCase().trim();
		const attr = this.getAttrToken(key);
		if (attr && attr.getValue() !== true) {
			throw new RangeError(`${key} attribute is not Boolean!`);
		} else if (attr) {
			attr.setValue(force === true);
		} else if (force !== false) {
			this.setAttr(key, true);
		}
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
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? this.#leadingSpace(super.toString()).length as TokenAttribute<T>
			: super.getAttribute(key);
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
	override toHtmlInternal(): string {
		const map = new Map(
			this.childNodes.filter(child => child instanceof AttributeToken).map(child => [child.name, child]),
		);
		return map.size === 0 ? '' : ` ${html([...map.values()], ' ')}`;
	}
}

classes['AttributesToken'] = __filename;
