import {generateForSelf, fixBy} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {padded} from '../mixin/padded';
import {gapped} from '../mixin/gapped';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {
	Config,
	LintError,
	AST,
} from '../base';

/**
 * argument wrapped in `{{{}}}`
 *
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken[]]}`
 */
@noEscape @padded('{{{') @gapped()
export abstract class ArgToken extends Token {
	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	override get type(): 'arg' {
		return 'arg';
	}

	/* PRINT ONLY */

	/** default value / 预设值 */
	get default(): string | false {
		LSP: return this.childNodes[1]?.text() ?? false;
	}

	/* PRINT ONLY END */

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

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				{lintConfig} = Parser,
				rect = new BoundingRect(this, start);
			let rule: LintError.Rule = 'no-arg',
				s = lintConfig.getSeverity(rule);
			if (s && !this.getAttribute('include')) {
				const e = generateForSelf(this, rect, rule, 'unexpected-argument', s),
					[, argDefault] = this.childNodes;
				if (lintConfig.computeEditInfo && argDefault) {
					e.suggestions = [fixBy(e, 'expand', argDefault.text())];
				}
				errors.push(e);
			}
			const ext = this.closest('ext');
			if (ext) {
				rule = 'arg-in-ext';
				s = lintConfig.getSeverity(rule, ext.name);
				if (s) {
					errors.push(generateForSelf(this, rect, rule, 'argument-in-ext', s));
				}
			}
			return errors;
		}
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @private */
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start);
			json['default'] = this.default;
			return json;
		}
	}
}
