import {
	removeCommentLine,
} from '../util/string';
import {Token} from './index';
import type {
	Config,
} from '../base';
import type {
	AtomToken,
	TranscludeToken,
	SyntaxToken,
} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

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
	abstract override get previousSibling(): AtomToken
		| SyntaxToken
		| this
		| undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [Token, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'parameter' {
		return 'parameter';
	}

	/** whether to be anonymous / 是否是匿名参数 */
	get anon(): boolean {
		return this.firstChild.length === 0;
	}

	/* NOT FOR BROWSER */

	/** parameter value / 参数值 */
	get value(): string {
		return this.getValue();
	}

	/* NOT FOR BROWSER END */

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

		/* NOT FOR BROWSER */

		if (typeof key === 'string') {
			this.trimName(removeCommentLine(key));
		}
	}

	/** @private */
	trimName(
		name:
			string |
			Token,
		set = true,
	): string {
		const trimmed =
			(
				typeof name === 'string'
					? name :
					name.toString(true)
			)
				.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		if (set) {
			this.setAttribute('name', trimmed);
		}
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

	/** @private */
	override text(): string {
		return this.anon
			? this.getValue()
			: this.childNodes.map(child => child.text().trim()).join('=');
	}

	/** @private */
	override getGaps(): number {
		return this.anon ? 0 : 1;
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string {
		const {parentNode, lastChild, anon, name} = this,
			value = removeCommentLine(lastChild.text());
		return anon && (
			parentNode?.isTemplate() !== false
			|| name === '2' && parentNode.type === 'magic-word' && parentNode.name === 'tag'
		)
			? value
			: value.trim();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [Token, Token];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ParameterToken(
				this.anon ? Number(this.name) : undefined,
				undefined,
				this.getAttribute('config'),
			);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			if (this.anon) {
				token.setAttribute('name', this.name);
			}
			return token;
		});
	}
}
