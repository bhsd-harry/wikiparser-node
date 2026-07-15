import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {
	Config,
} from '../base';

/**
 * argument wrapped in `{{{}}}`
 *
 * `{{{}}}`包裹的参数
 */
export abstract class ArgToken extends Token {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

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
		const {length, childNodes, name = this.#getName()} = this;
		return length === 1 ? `{{{${name}}}}` : `{{{${name}|${childNodes[1]!.text()}}}}`;
	}

	/** 获取name */
	#getName(): string {
		return this.firstChild.text().trim();
	}
}
