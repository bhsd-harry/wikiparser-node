import {undo} from '../util/debug';
import {text} from '../util/string';
import {Parser} from '../index';
import {Token} from '.';
import type {AstNodes} from '../lib/node';

declare type SyntaxTypes = 'plain' | 'heading-trail' | 'magic-word-name' | 'table-syntax';

/** 满足特定语法格式的plain Token */
export class SyntaxToken extends Token {
	declare type: SyntaxTypes;
	#pattern;

	/**
	 * @browser
	 * @param pattern 语法正则
	 * @throws `RangeError` 含有g修饰符的语法正则
	 */
	constructor(
		wikitext: string | undefined,
		pattern: RegExp,
		type: SyntaxTypes = 'plain',
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
	) {
		if (pattern.global) {
			throw new RangeError(`SyntaxToken 的语法正则不能含有 g 修饰符：${String(pattern)}`);
		}
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
		this.#pattern = pattern;
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new SyntaxToken(undefined, this.#pattern, this.type, config, [], acceptable) as this;
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	protected override afterBuild(): void {
		const /** @implements */ syntaxListener: AstListener = (e, data) => {
			const pattern = this.#pattern;
			if (!Parser.running && !pattern.test(this.text())) {
				undo(e, data);
				Parser.error(`不可修改 ${this.constructor.name} 的语法！`, pattern);
				throw new Error(`不可修改 ${this.constructor.name} 的语法！`);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'pattern' ? this.#pattern as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	protected override hasAttribute(key: string): boolean {
		return key === 'pattern' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param elements 待替换的子节点
	 */
	override replaceChildren(...elements: (AstNodes | string)[]): void {
		if (this.#pattern.test(text(elements))) {
			Parser.run(() => {
				super.replaceChildren(...elements);
			});
		}
	}
}

Parser.classes['SyntaxToken'] = __filename;
