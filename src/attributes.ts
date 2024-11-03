import {generateForSelf, generateForChild} from '../util/lint';
import {
	removeComment,
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

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
export abstract class AttributesToken extends Token {
	declare readonly name: string;
	#type;

	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get parentNode(): ExtToken | HtmlToken | TableTokens | undefined;
	abstract override get previousSibling(): SyntaxToken | undefined;

	override get type(): AttributesTypes {
		return this.#type;
	}

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
		});
		this.#type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = /([^\s/](?:(?!\0\d+~\x7F)[^\s/=])*)(?:((?:\s(?:\s|\0\d+[cn]\x7F)*)?(?:=|\0\d+~\x7F)(?:\s|\0\d+[cn]\x7F)*)(?:(["'])(.*?)(\3|$)|(\S*)))?/gsu;
			let out = '',
				mt = regex.exec(attr) as RegExpExecArray & {1: string} | null,
				lastIndex = 0;
			const insertDirty = /** 插入无效属性 */ (): void => {
				if (out) {
					super.insertAt(new AtomToken(out, toDirty(type), config, accum, {
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
			{parentNode, childNodes} = this,
			attrs = new Map<string, AttributeToken[]>(),
			duplicated = new Set<string>(),
			rect = new BoundingRect(this, start);
		if (parentNode?.type === 'html' && parentNode.closing && this.text().trim()) {
			const e = generateForSelf(this, rect, 'no-ignored', 'attributes of a closing tag');
			e.fix = {range: [start, e.endIndex], text: ''};
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
						/[\p{L}\d]/u.test(str) ? 'error' : 'warning',
					);
					e.suggestions = [
						{
							desc: 'remove',
							range: [e.startIndex, e.endIndex],
							text: ' ',
						},
					];
					errors.push(e);
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
				child instanceof AtomToken ? {class: child.toString().trim() && 'attr-dirty'} : undefined,
			)).join('')}</span>`
			: '';
	}
}
