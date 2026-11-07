import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {
	Config,
} from '../base';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

/**
 * argument wrapped in `{{{}}}`
 *
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken] | [AtomToken, Token, ...HiddenToken[]]}`
 */
export abstract class ArgToken extends Token {
	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token, ...HiddenToken[]];

	/* NOT FOR BROWSER END */

	override get type(): 'arg' {
		return 'arg';
	}

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			let token: Token;
			if (i === 0) {
				token = new AtomToken(part, 'arg-name', config, accum, {
				});
			} else if (i > 1) {
				token = new HiddenToken(part, config, accum);
			} else {
				token = new Token(part, config, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
			}
			super.insertAt(token);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `{{{${super.toString(skip, '|')}}}}`;
	}

	/** @private */
	override text(): string {
		// eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
		const {length, childNodes, name = this.#getName()} = this;
		return length === 1 ? `{{{${name}}}}` : `{{{${name}|${childNodes[1]!.text()}}}}`;
	}

	/** 获取name */
	#getName(): string {
		return this.firstChild.text().trim();
	}

	/** 更新name */
	#setName(): void {
		LSP: this.setAttribute('name', this.#getName());
	}

	/** @private */
	override afterBuild(): void {
		LSP: this.#setName();
		super.afterBuild();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [name, ...cloned] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ArgToken([''], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(name);
			token.safeAppend(cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		super.insertAt(token, i);
		if (i === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/** @private */
	override toHtmlOrPlain(_: unknown, method: Method, opt?: HtmlOpt): string {
		if (this.length === 1) {
			const html = this.toString();
			return opt?.nowrap ? html.replaceAll('\n', ' ') : html;
		}
		return this.childNodes[1]![method](opt);
	}
}
