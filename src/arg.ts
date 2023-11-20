import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {LintError} from '../index';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export class ArgToken extends Token {
	/** @browser */
	override readonly type = 'arg';
	declare childNodes: [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;

	/**
	 * 预设值
	 * @browser
	 */
	get default(): string | false {
		return this.childNodes[1]?.text() ?? false;
	}

	/**
	 * @browser
	 * @param parts 以'|'分隔的各部分
	 */
	constructor(parts: string[], config = Parser.getConfig(), accum: Token[] = []) {
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
				super.insertAt(token.setAttribute('stage', 2));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return `{{{${super.toString(omit, '|')}}}}`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	protected override getPadding(): number {
		return 3;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
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
			const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple braces'),
					{
						startIndex,
						startCol,
					} = error;
				return {
					...error,
					startIndex: startIndex - 1,
					startCol: startCol - 1,
				};
			}));
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}
}
