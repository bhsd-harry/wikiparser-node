import {removeComment} from '../util/string';
import {Token} from './index';
import type {
	Config,
} from '../base';
import type {AtomToken, TranscludeToken} from '../internal';

/**
 * template or magic word parameter
 *
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
export abstract class ParameterToken extends Token {
	declare readonly name: string;

	declare readonly childNodes: readonly [Token, Token];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): TranscludeToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	override get type(): 'parameter' {
		return 'parameter';
	}

	/** whether to be anonymous / 是否是匿名参数 */
	get anon(): boolean {
		return this.firstChild.length === 0;
	}

	/**
	 * @param key 参数名
	 * @param value 参数值
	 */
	constructor(key?: string | number, value?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, accum, {
			}),
			token = new Token(value, config, accum);
		keyToken.type = 'parameter-key';
		keyToken.setAttribute('stage', 2);
		token.type = 'parameter-value';
		token.setAttribute('stage', 2);
		this.append(keyToken, token);
	}

	/** @private */
	trimName(name: Token, set = true): string {
		const trimmed = name.toString(true)
			.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		this.setAttribute('name', trimmed);
		return trimmed;
	}

	/** @private */
	override afterBuild(): void {
		if (!this.anon) {
			const {parentNode, firstChild} = this,
				name = this.trimName(firstChild);
			if (parentNode) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.anon ? this.lastChild.toString(skip) : super.toString(skip, '=');
	}

	override text(): string {
		return this.anon ? this.lastChild.text() : super.text('=');
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string {
		const value = removeComment(this.lastChild.text());
		return this.anon && this.parentNode?.isTemplate() !== false ? value : value.trim();
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param value parameter value / 参数值
	 */
	setValue(value: string): void {
		this.lastChild.replaceChildren(value);
	}
}
