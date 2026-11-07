import {
	removeComment,
	trimLc,

	/* NOT FOR BROWSER */

	text,
} from '../util/string';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {
	Config,

	/* NOT FOR BROWSER */

	RenderOpt,
} from '../base';
import type {
	ExtToken,
	HtmlToken,
	SyntaxToken,
} from '../internal';
import type {AttributeTypes} from './attribute';
import type {TableTokens} from './table/index';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {Shadow} from '../util/debug';
import {ClassList} from '../lib/classList';
import {clone} from '../mixin/clone';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

declare type AttributesTypes = `${AttributeTypes}s`;
declare type AttributeDirty = `${AttributeTypes}-dirty`;
declare type Child = AtomToken | AttributeToken;

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

/* NOT FOR BROWSER */

/**
 * 处理不显示的`<ref>`
 * @param token 不显示的节点
 * @param render 渲染设置
 */
const renderRefs = (token: Token, render?: RenderOpt): void => {
	for (const ref of token.querySelectorAll<ExtToken>('ext#ref')) {
		ref.toHtmlInternal({render});
	}
};

/* NOT FOR BROWSER END */

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

	#classList: ClassList | undefined;

	/* NOT FOR BROWSER END */

	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get parentNode(): ExtToken
		| HtmlToken
		| TableTokens
		| undefined;
	abstract override get previousSibling():
		SyntaxToken |
		undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];

	/* NOT FOR BROWSER END */

	override get type(): AttributesTypes {
		return this.#type;
	}

	/* NOT FOR BROWSER */

	/** class attribute in string / 以字符串表示的class属性 */
	get className(): string {
		return this.getAttr('class') || '';
	}

	set className(className) {
		this.setAttr('class', className);
	}

	/** class attribute in Set / 以Set表示的class属性 */
	get classList(): ClassList {
		this.#classList ??= new ClassList(this);
		return this.#classList;
	}

	/** id attribute / id属性 */
	get id(): string {
		return this.getAttr('id') || '';
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param attr 标签属性
	 * @param type 标签类型
	 * @param name 标签名
	 */
	constructor(attr: string | undefined, type: AttributesTypes, name: string, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.#type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = /([^\s/](?:(?!\0\d+~\x7F)[^\s/=])*)(?:((?:\s(?:\s|\0\d+[cn]\x7F)*)?(?:=|\0\d+~\x7F)(?:\s|\0\d+[cn]\x7F)*)(?:(["'])(.*?)(\3|$)|(\S*)))?/gsu;
			let out = '',
				lastIndex = 0;
			const insertDirty = /** 插入无效属性 */ (): void => {
				if (out) {
					super.insertAt(
						new AtomToken(
							out,
							toDirty(type),
							config,
							accum,
						),
					);
					out = '';
				}
			};
			for (let mt = regex.exec(attr); mt; mt = regex.exec(attr)) {
				const {index, 0: full, 1: key, 2: equal, 3: quoteStart, 4: quoted, 5: quoteEnd, 6: unquoted} = mt;
				out += attr.slice(lastIndex, index);
				if (
					/^(?:[\w:]|\0\d+t\x7F)(?:[\w:.-]|\0\d+t\x7F)*$/u
						.test(removeComment(key!).trim())
				) {
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
			}
			out += attr.slice(lastIndex);
			insertDirty();
		}
	}

	/** @private */
	override afterBuild(): void {
		const {parentNode} = this;
		if (parentNode?.is('td')) {
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
		const tokens = this.getAttrTokens(key);
		return tokens[tokens.length - 1];
	}

	/**
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | undefined {
		return this.getAttrToken(key)?.getValue();
	}

	/** @private */
	lintRef(): string {
		const followAttr = this.getAttrToken('follow'),
			follow = followAttr?.getValue(),
			name = this.getAttr('name');
		if (follow && !/\D/u.test(follow)) {
			const msg = 'int-name';
			return msg;
		} else if (follow && (this.hasAttr('details') || name && /\D/u.test(name))) {
			const msg = 'ref-follow';
			return msg;
		}
		return '';
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new AttributesToken(undefined, this.type, this.name, this.getAttribute('config'));
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` if the inserted attribute is not for the current tag
	 */
	override insertAt<T extends Child>(token: T, i = this.length): T {
		if (!(token instanceof AttributeToken)) {
			return super.insertAt(token, i);
		}
		const {type, length} = this;
		if (i === length) {
			const {lastChild} = this;
			if (lastChild instanceof AttributeToken) {
				lastChild.close();
			}
		} else {
			token.close();
		}
		super.insertAt(token, i);
		const {previousVisibleSibling, nextVisibleSibling} = token,
			dirtyType = toDirty(type),
			config = this.getAttribute('config'),
			acceptable = {
			};
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
	 * @throws `RangeError` if the attribute of an extension tag contains `>`
	 */
	setAttr(key: string, value: string): void {
		require('../addon/attribute');
		this.setAttr(key, value);
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
		const str = super.toString(skip);
		return this.#leadingSpace(str) + str;
	}

	/** @private */
	override text(): string {
		const str = text(this.childNodes.filter(child => child instanceof AttributeToken), ' ');
		return this.#leadingSpace(str) + str;
	}

	/** @private */
	@cached()
	override toHtmlInternal({render}: HtmlOpt = {}): string {
		const map = new Map<string, AttributeToken>();
		for (const child of this.childNodes) {
			if (child instanceof AttributeToken) {
				const last = map.get(child.name);
				if (last) {
					renderRefs(last, render);
				}
				map.set(child.name, child);
			} else {
				renderRefs(child, render);
			}
		}
		const output = map.size === 0 ? '' : html(map.values(), ' ', {removeBlank: true});
		return output && ` ${output}`;
	}
}
