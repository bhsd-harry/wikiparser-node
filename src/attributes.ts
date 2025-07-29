import {
	removeComment,
} from '../util/string';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {Config} from '../base';
import type {ExtToken} from '../internal';
import type {AttributeTypes} from './attribute';

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
 * attributes of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: (AtomToken|AttributeToken)[]}`
 */
export abstract class AttributesToken extends Token {
	readonly #type;

	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get previousSibling(): undefined;

	override get type(): AttributesTypes {
		return this.#type;
	}

	/**
	 * @param attr 标签属性
	 * @param type 标签类型
	 * @param name 标签名
	 */
	constructor(attr: string | undefined, type: AttributesTypes, name: string, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.#type = type;
		if (attr) {
			const regex = /([^\s/][^\s/=]*)(?:(\s*=\s*)(?:(["'])([\s\S]*?)(\3|$)|(\S*)))?/gu;
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
				if (/^[\w:][\w:.-]*$/u.test(removeComment(key).trim())) {
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
}
