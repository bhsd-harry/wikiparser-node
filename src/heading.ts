import {Token} from './index';
import {AtomToken as SyntaxToken} from './atom';
import type {
	Config,
} from '../base';
import type {AstText} from '../internal';

/**
 * section heading
 *
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
export abstract class HeadingToken extends Token {
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): SyntaxToken;
	abstract override get nextSibling(): AstText | undefined;

	override get type(): 'heading' {
		return 'heading';
	}

	/** level of the heading / 标题层级 */
	get level(): number {
		return this.#level;
	}

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: readonly [string?, string?], config: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		this.#level = level;
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(
			input[1],
			'heading-trail',
			config,
			accum,
		);
		this.append(token, trail);
	}

	/** 标题格式的等号 */
	#getEquals(): string {
		return '='.repeat(this.level);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.toString(skip) + equals + this.lastChild.toString(skip);
	}

	/** @private */
	override text(): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.text() + equals;
	}
}
