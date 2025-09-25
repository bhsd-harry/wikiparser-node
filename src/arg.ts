import {text} from '../util/string';
import {generateForSelf, generateForChild, fixBy, fixByRemove, fixByEscape} from '../util/lint';
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

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			if (i === 0) {
				const token = new AtomToken(part, 'arg-name', config, accum, {
				});
				super.insertAt(token);
			} else if (i > 1) {
				const token = new HiddenToken(part, config, accum);
				super.insertAt(token);
			} else {
				const token = new Token(part, config, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
				super.insertAt(token);
			}
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `{{{${super.toString(skip, '|')}}}}`;
	}

	/** @private */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** 更新name */
	#setName(): void {
		// eslint-disable-next-line no-unused-labels
		LSP: this.setAttribute('name', this.firstChild.text().trim());
	}

	/** @private */
	override afterBuild(): void {
		// eslint-disable-next-line no-unused-labels
		LSP: this.#setName();
		super.afterBuild();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const {childNodes: [argName, argDefault, ...rest]} = this;
			argName.setAttribute('aIndex', start + 3);
			const errors = argName.lint(start + 3, re);
			if (argDefault) {
				const index = start + 4 + argName.toString().length;
				argDefault.setAttribute('aIndex', index);
				const childErrors = argDefault.lint(index, re);
				if (childErrors.length > 0) {
					errors.push(...childErrors);
				}
			}
			const rules = ['no-ignored', 'no-arg'] as const,
				{lintConfig} = Parser,
				{computeEditInfo} = lintConfig,
				s = rules.map(rule => lintConfig.getSeverity(rule, 'arg') as LintError.Severity);
			if (s[0] && rest.length > 0) {
				const rect = new BoundingRect(this, start);
				errors.push(...rest.map(child => {
					const e = generateForChild(child, rect, rules[0], 'invisible-triple-braces', s[0]);
					e.startIndex--;
					e.startCol--;
					if (computeEditInfo) {
						e.suggestions = [
							fixByRemove(e),
							fixByEscape(e.startIndex, '{{!}}'),
						];
					}
					return e;
				}));
			}
			if (s[1] && !this.getAttribute('include')) {
				const e = generateForSelf(this, {start}, rules[1], 'unexpected-argument', s[1]);
				if (computeEditInfo && argDefault) {
					e.suggestions = [fixBy(e, 'expand', argDefault.text())];
				}
				errors.push(e);
			}
			return errors;
		}
	}
}
