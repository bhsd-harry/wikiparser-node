import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {
	LintError,
} from '../base';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export abstract class ArgToken extends Token {
	override readonly type = 'arg';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
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
	override toString(): string {
		return `{{{${super.toString('|')}}}}`;
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
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const {childNodes: [argName, argDefault, ...rest]} = this;
		if (!this.getAttribute('include')) {
			const e = generateForSelf(this, {start}, 'no-arg', 'unexpected template argument');
			if (argDefault) {
				e.fix = {
					range: [start, e.endIndex],
					text: argDefault.text(),
				};
			}
			return [e];
		}
		const errors = argName.lint(start + 3, re);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length, re));
		}
		if (rest.length > 0) {
			const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(...rest.map(child => {
				const e = generateForChild(child, rect, 'no-ignored', 'invisible content inside triple braces');
				e.startIndex--;
				e.startCol--;
				e.suggestions = [
					{
						desc: 'remove',
						range: [e.startIndex, e.endIndex],
						text: '',
					},
					{
						desc: 'escape',
						range: [e.startIndex, e.startIndex + 1],
						text: '{{!}}',
					},
				];
				return e;
			}));
		}
		return errors;
	}
}
