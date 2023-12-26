import {generateForSelf, generateForChild} from '../util/lint';
import {
	removeComment,
} from '../util/string';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {LintError} from '../base';
import type {ExtToken, HtmlToken, TdToken, TrToken, TableToken} from '../internal';
import type {AttributeTypes} from './attribute';

declare type AttributesTypes = `${AttributeTypes}s`;
declare type AttributeDirty = `${AttributeTypes}-dirty`;

/** @ignore */
const toAttributeType = (type: AttributesTypes): AttributeTypes => type.slice(0, -1) as AttributeTypes;
/** @ignore */
const toDirty = (type: AttributesTypes): AttributeDirty => `${toAttributeType(type)}-dirty`;

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
export class AttributesToken extends Token {
	declare type: AttributesTypes;
	declare name: string;

	declare childNodes: (AtomToken | AttributeToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | AttributeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | HtmlToken | TableToken | TrToken | TdToken | undefined;

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
		this.type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = new RegExp(
				`([^\\s/](?:(?!\0\\d+~\x7F)[^\\s/=])*)` // 属性名
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
}
