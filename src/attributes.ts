import {generateForSelf, generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {
	removeComment,

	/* NOT FOR BROWSER */

	normalizeSpace,
	text,
	html,
} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {LintError} from '../base';
import type {ExtToken, HtmlToken, TdToken, TrToken, TableToken} from '../internal';
import type {AttributeTypes} from './attribute';

/* NOT FOR BROWSER */

const stages = {'ext-attrs': 0, 'html-attrs': 2, 'table-attrs': 3};

/* NOT FOR BROWSER END */

const regex = /([^\s/](?:(?!\0\d+~\x7F)[^\s/=])*)(?:((?:\s(?:\s|\0\d+c\x7F)*)?(?:=|\0\d+~\x7F)(?:\s|\0\d+c\x7F)*)(?:(["'])(.*?)(\3|$)|(\S*)))?/gsu;

declare type AttributesTypes = `${AttributeTypes}s`;
declare type AttributeDirty = `${AttributeTypes}-dirty`;

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

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
export abstract class AttributesToken extends Token {
	declare readonly name: string;
	#type;
	#classList: Set<string> | undefined;

	declare readonly childNodes: readonly (AtomToken | AttributeToken)[];
	abstract override get firstChild(): AtomToken | AttributeToken | undefined;
	abstract override get lastChild(): AtomToken | AttributeToken | undefined;
	abstract override get parentNode(): ExtToken | HtmlToken | TableToken | TrToken | TdToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): (AtomToken | AttributeToken)[];
	abstract override get firstElementChild(): AtomToken | AttributeToken | undefined;
	abstract override get lastElementChild(): AtomToken | AttributeToken | undefined;
	abstract override get parentElement(): ExtToken | HtmlToken | TableToken | TrToken | TdToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): AttributesTypes {
		return this.#type;
	}

	/* NOT FOR BROWSER */

	/** getAttrs()方法的getter写法 */
	get attributes(): Record<string, string | true> {
		return this.getAttrs();
	}

	set attributes(attrs) {
		this.replaceChildren();
		this.setAttr(attrs);
	}

	/** 以字符串表示的class属性 */
	get className(): string {
		const attr = this.getAttr('class');
		return typeof attr === 'string' ? attr : '';
	}

	set className(className) {
		this.setAttr('class', className || false);
	}

	/** 以Set表示的class属性 */
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

	/** id属性 */
	get id(): string {
		const attr = this.getAttr('id');
		return typeof attr === 'string' ? attr : '';
	}

	set id(id) {
		this.setAttr('id', id || false);
	}

	/** 是否含有无效属性 */
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
			regex.lastIndex = 0;
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
				if (/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(removeComment(key).trim())) {
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
	 * 所有指定属性名的AttributeToken
	 * @param key 属性名
	 */
	getAttrTokens(key?: string): AttributeToken[] {
		return this.childNodes.filter(
			(child): child is AttributeToken =>
				child instanceof AttributeToken && (!key || child.name === key.toLowerCase().trim()),
		);
	}

	/**
	 * 指定属性名的最后一个AttributeToken
	 * @param key 属性名
	 */
	getAttrToken(key: string): AttributeToken | undefined {
		const tokens = this.getAttrTokens(key);
		return tokens[tokens.length - 1];
	}

	/**
	 * 获取指定属性
	 * @param key 属性键
	 */
	getAttr(key: string): string | true | undefined {
		return this.getAttrToken(key)?.getValue();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{parentNode, length, childNodes} = this,
			attrs = new Map<string, AttributeToken[]>(),
			duplicated = new Set<string>(),
			rect = new BoundingRect(this, start);
		if (parentNode?.type === 'html' && parentNode.closing && this.text().trim()) {
			const e = generateForSelf(this, rect, 'no-ignored', 'attributes of a closing tag');
			e.fix = {range: [start, e.endIndex], text: ''};
			errors.push(e);
		}
		for (let i = 0; i < length; i++) {
			const attr = childNodes[i]!;
			if (attr instanceof AtomToken && attr.text().trim()) {
				const e = generateForChild(attr, rect, 'no-ignored', 'containing invalid attribute');
				e.suggestions = [
					{
						desc: 'remove',
						range: [e.startIndex, e.endIndex],
						text: ' ',
					},
				];
				errors.push(e);
			} else if (attr instanceof AttributeToken) {
				const {name} = attr;
				if (attrs.has(name)) {
					duplicated.add(name);
					attrs.get(name)!.push(attr);
				} else {
					attrs.set(name, [attr]);
				}
			}
		}
		if (duplicated.size > 0) {
			for (const key of duplicated) {
				errors.push(...attrs.get(key)!.map(
					attr => generateForChild(attr, rect, 'no-duplicate', Parser.msg('duplicated $1 attribute', key)),
				));
			}
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return this.toString()
			? `<span class="wpb-${this.type}">${this.childNodes.map(child => child.print(
				child instanceof AtomToken ? {class: 'attr-dirty'} : undefined,
			)).join('')}</span>`
			: '';
	}

	/* NOT FOR BROWSER */

	/** 清理无效属性 */
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
			const token = new AttributesToken(undefined, this.type, this.name, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 标签不匹配
	 */
	override insertAt<T extends AttributeToken | AtomToken>(token: T, i = this.length): T {
		if (!(token instanceof AttributeToken)) {
			if (token.toString().trim()) {
				this.constructorError('can only insert AttributeToken');
			}
			return super.insertAt(token, i);
		} else if (token.type !== this.type.slice(0, -1) || token.tag !== this.name) {
			throw new RangeError(`The AttributeToken to be inserted can only be used for <${token.tag}> tag!`);
		} else if (i === this.length) {
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
			type = toDirty(this.type),
			config = this.getAttribute('config'),
			acceptable = {[`Stage-${stages[this.type]}`]: ':'};
		if (nextVisibleSibling && !/^\s/u.test(nextVisibleSibling.toString())) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', type, config, [], acceptable)), i + 1);
		}
		if (previousVisibleSibling && !/\s$/u.test(previousVisibleSibling.toString())) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', type, config, [], acceptable)), i);
		}
		return token;
	}

	/**
	 * 设置指定属性
	 * @param key 属性键
	 * @param value 属性值
	 * @param prop 属性对象
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
		} else if (this.type === 'ext-attrs' && typeof value === 'string' && value.includes('>')) {
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
			toAttributeType(this.type),
			this.name,
			key,
			value === true ? '' : '=',
			value === true ? '' : value,
			['"', '"'],
			this.getAttribute('config'),
		));
		this.insertAt(token);
	}

	/**
	 * 标签是否具有某属性
	 * @param key 属性键
	 */
	hasAttr(key: string): boolean {
		return this.getAttrTokens(key).length > 0;
	}

	/** 获取全部的属性名 */
	getAttrNames(): Set<string> {
		return new Set(this.getAttrTokens().map(({name}) => name));
	}

	/** 获取全部属性 */
	getAttrs(): Record<string, string | true> {
		return Object.fromEntries(this.getAttrTokens().map(({name, value}) => [name, value]));
	}

	/**
	 * 移除指定属性
	 * @param key 属性键
	 */
	removeAttr(key: string): void {
		for (const attr of this.getAttrTokens(key)) {
			attr.remove();
		}
	}

	/**
	 * 开关指定属性
	 * @param key 属性键
	 * @param force 强制开启或关闭
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
	override toHtml(): string {
		const map = new Map<string, AttributeToken>();
		for (const child of this.childNodes) {
			if (child instanceof AttributeToken) {
				map.set(child.name, child);
			}
		}
		return ` ${html([...map.values()], ' ')}`;
	}
}

classes['AttributesToken'] = __filename;
