import {generateForSelf, generateForChild, fixByRemove, fixByOpen} from '../util/lint';
import {
	removeComment,
	trimLc,
} from '../util/string';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {AttributeToken} from './attribute';
import type {Config, LintError} from '../base';
import type {
	ExtToken,
	HtmlToken,
	SyntaxToken,
	TdToken,
} from '../internal';
import type {AttributeTypes} from './attribute';
import type {TableTokens} from './table/index';

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

	declare readonly childNodes: readonly (AtomToken | AttributeToken)[];
	abstract override get firstChild(): AtomToken | AttributeToken | undefined;
	abstract override get lastChild(): AtomToken | AttributeToken | undefined;
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
	constructor(attr: string | undefined, type: AttributesTypes, name: string, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
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
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		return this.toString()
			? `<span class="wpb-${this.type}${this.#lint() ? ' wpb-invalid' : ''}">${
				this.childNodes.map(child => child.print(
					child instanceof AtomToken ? {class: child.toString().trim() && 'attr-dirty'} : undefined,
				)).join('')
			}</span>`
			: '';
	}
}
