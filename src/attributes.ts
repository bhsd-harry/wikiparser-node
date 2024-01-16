import {generateForSelf, generateForChild} from '../util/lint';
import {
	normalizeSpace,
	text,
	removeComment,
} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {LintError} from '../base';
import type {ExtToken, HtmlToken, TdToken, TrToken, TableToken} from '../internal';
import type {AttributeTypes} from './attribute';

/* NOT FOR BROWSER */

const stages = {'ext-attrs': 0, 'html-attrs': 2, 'table-attrs': 3};

/* NOT FOR BROWSER END */

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
export class AttributesToken extends Token {
	declare type: AttributesTypes;
	declare readonly name: string;

	declare readonly childNodes: (AtomToken | AttributeToken)[];
	// @ts-expect-error abstract method
	abstract override get children(): (AtomToken | AttributeToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | HtmlToken | TableToken | TrToken | TdToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ExtToken | HtmlToken | TableToken | TrToken | TdToken | undefined;

	/* NOT FOR BROWSER */

	/** getAttrs()方法的getter写法 */
	get attributes(): Record<string, string | true> {
		return this.getAttrs();
	}

	set attributes(attrs) {
		this.replaceChildren();
		for (const [key, value] of Object.entries(attrs)) {
			this.setAttr(key, value);
		}
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
		return new Set(this.className.split(/\s/u));
	}

	set classList(classList) {
		this.setAttr('class', [...classList].join(' '));
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
		this.type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = new RegExp(
				'([^\\s/](?:(?!\0\\d+~\x7F)[^\\s/=])*)' // 属性名
				+ '(?:'
				+ '((?:\\s|\0\\d+c\x7F)*' // `=`前的空白字符
				+ '(?:=|\0\\d+~\x7F)' // `=`
				+ '(?:\\s|\0\\d+c\x7F)*)' // `=`后的空白字符
				+ `(?:(["'])(.*?)(\\3|$)|(\\S*))` // 属性值
				+ ')?',
				'gsu',
			);
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
						token = new AttributeToken(
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
		if (this.type === 'table-attrs') {
			const {parentNode} = this as this & {parentNode?: TableToken | TrToken | TdToken};
			this.setAttribute(
				'name',
				parentNode?.type === 'td' && parentNode.subtype === 'caption' ? 'caption' : parentNode?.type,
			);
		}
	}

	/**
	 * 所有指定属性名的AttributeToken
	 * @param key 属性名
	 */
	getAttrTokens(key?: string): readonly AttributeToken[] {
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
		return tokens.at(-1);
	}

	/**
	 * 获取指定属性
	 * @param key 属性键
	 */
	getAttr(key: string): string | true | undefined {
		return this.getAttrToken(key)?.getValue();
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{parentNode, length, childNodes} = this,
			attrs = new Map<string, AttributeToken[]>(),
			duplicated = new Set<string>();
		let rect: BoundingRect | undefined;
		if (parentNode?.type === 'html' && parentNode.closing && this.text().trim()) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForSelf(this, rect, 'attributes of a closing tag'));
		}
		for (let i = 0; i < length; i++) {
			const attr = childNodes[i]!;
			if (attr instanceof AtomToken && attr.text().trim()) {
				rect ??= {start, ...this.getRootNode().posFromIndex(start)};
				errors.push(generateForChild(attr, rect, 'containing invalid attribute'));
			} else if (attr instanceof AttributeToken) {
				const {name} = attr;
				if (attrs.has(name)) {
					duplicated.add(name);
					attrs.get(name)!.push(attr);
				} else if (name !== 'class') {
					attrs.set(name, [attr]);
				}
			}
		}
		if (duplicated.size > 0) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			for (const key of duplicated) {
				errors.push(...attrs.get(key)!.map(
					attr => generateForChild(attr, rect!, Parser.msg('duplicated $1 attribute', key)),
				));
			}
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return String(this)
			? `<span class="wpb-${this.type}">${this.childNodes.map(child => child.print(
				child instanceof AtomToken && child.text().trim() ? {class: 'attr-dirty'} : undefined,
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
			Parser.warn(`${this.constructor.name}.sanitize 方法将清理无效属性！`);
		}
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new AttributesToken(undefined, this.type, this.name, this.getAttribute('config')) as this;
			token.append(...cloned);
			token.setAttribute('name', this.name);
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
			if (String(token).trim()) {
				this.constructorError('只能插入 AttributeToken');
			}
			return super.insertAt(token, i);
		} else if (token.type !== this.type.slice(0, -1) || token.tag !== this.name) {
			throw new RangeError(`待插入的AttributeToken只可用于${token.tag}标签！`);
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
		if (nextVisibleSibling && !/^\s/u.test(String(nextVisibleSibling))) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', type, config, [], acceptable)), i + 1);
		}
		if (previousVisibleSibling && !/\s$/u.test(String(previousVisibleSibling))) {
			super.insertAt(Shadow.run(() => new AtomToken(' ', type, config, [], acceptable)), i);
		}
		return token;
	}

	/**
	 * 设置指定属性
	 * @param key 属性键
	 * @param value 属性值
	 * @throws `RangeError` 扩展标签属性不能包含">"
	 */
	setAttr(key: string, value: string | boolean): void {
		if (this.type === 'ext-attrs' && typeof value === 'string' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		}
		key = key.toLowerCase().trim();
		const attr = this.getAttrToken(key);
		if (attr) {
			attr.setValue(value);
			return;
		} else if (value === false) {
			return;
		}
		const token = Shadow.run(() => new AttributeToken(
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
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
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
	override toString(omit?: Set<string>): string {
		if (this.type === 'table-attrs') {
			normalizeSpace(this);
		}
		const str = super.toString(omit);
		return `${this.#leadingSpace(str)}${str}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding'
			? this.#leadingSpace(super.toString()).length as TokenAttributeGetter<T>
			: super.getAttribute(key);
	}

	/** @override */
	override text(): string {
		if (this.type === 'table-attrs') {
			normalizeSpace(this);
		}
		const str = text(this.childNodes.filter(child => child instanceof AttributeToken), ' ');
		return `${this.#leadingSpace(str)}${str}`;
	}
}

classes['AttributesToken'] = __filename;
