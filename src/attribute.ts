import Parser from '../index';
import {Token} from './index';
import type {
	Config,
} from '../base';
import type {AstText as AtomToken} from '../lib/text';
import type {AttributesToken} from '../internal';

export type AttributeTypes = 'ext-attr';

/**
 * attribute of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AstText, Token|AstText]}`
 */
export abstract class AttributeToken extends Token {
	#type;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [AtomToken, Token | AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token | AtomToken;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): AtomToken | this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	override get type(): AttributeTypes {
		return this.#type;
	}

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
		const keyToken = key;
		let valueToken: Token | string;
		if (
			tag === 'gallery' && key === 'caption'
			|| tag === 'ref' && key === 'details'
		) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 1);
		} else {
			valueToken = value ?? '';
		}
		super(undefined, config, accum);
		this.#type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = [...quotes];
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
}
