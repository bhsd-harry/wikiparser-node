import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {LintError} from '../base';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export class ArgToken extends Token {
	override readonly type = 'arg';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;

	/** 预设值 */
	get default(): string | false {
		return this.childNodes[1]?.text() ?? false;
	}

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: readonly string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (let i = 0; i < parts.length; i++) {
			if (i === 0) {
				const token = new AtomToken(parts[i], 'arg-name', config, accum, {
				});
				super.insertAt(token);
			} else if (i > 1) {
				const token = new HiddenToken(parts[i], config, accum, {
				});
				super.insertAt(token);
			} else {
				const token = new Token(parts[i], config, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
				super.insertAt(token);
			}
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `{{{${super.toString(omit, '|')}}}}`;
	}

	/** @override */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 3 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		if (!this.getAttribute('include')) {
			return [generateForSelf(this, {start}, 'unexpected template argument')];
		}
		const {childNodes: [argName, argDefault, ...rest]} = this,
			errors = argName.lint(start + 3);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length));
		}
		if (rest.length > 0) {
			const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple braces');
				return {
					...error,
					startIndex: error.startIndex - 1,
					startCol: error.startCol - 1,
				};
			}));
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			default: this.default,
		};
	}
}
