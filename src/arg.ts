import {text} from '../util/string';
import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {LintError} from '../index';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export abstract class ArgToken extends Token {
	/** @browser */
	override readonly type = 'arg';
	declare name: string;
	declare childNodes: [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
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
		super(undefined, config, true, accum, {
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
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				super.insertAt(token.setAttribute('stage', 2));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return `{{{${super.toString(selector, '|')}}}}`;
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
		const {childNodes: [argName, argDefault, ...rest]} = this,
			errors = argName.lint(start + 3);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length));
		}
		if (rest.length > 0) {
			const rect = {start, ...this.getRootNode().posFromIndex(start)};
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
