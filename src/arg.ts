import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {padded} from '../mixin/padded';
import {gapped} from '../mixin/gapped';
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
@padded('{{{') @gapped()
export abstract class ArgToken extends Token {
	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	override get type(): 'arg' {
		return 'arg';
	}

	/** default value / 预设值 */
	get default(): string | false {
		return this.childNodes[1]?.text() ?? false;
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

	/** 设置name */
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
		if (rest.length > 0) {
			const rect = new BoundingRect(this, start);
			errors.push(...rest.map(child => {
				const e = generateForChild(
					child,
					rect,
					'no-ignored',
					'invisible content inside triple braces',
				);
				e.startIndex--;
				e.startCol--;
				e.suggestions = [
					{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''},
					{desc: 'escape', range: [e.startIndex, e.startIndex + 1], text: '{{!}}'},
				];
				return e;
			}));
		}
		if (!this.getAttribute('include')) {
			const e = generateForSelf(
				this,
				{start},
				'no-arg',
				'unexpected template argument',
				'warning',
			);
			if (argDefault) {
				e.suggestions = [{range: [start, e.endIndex], text: argDefault.text(), desc: 'expand'}];
			}
			errors.push(e);
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['default'] = this.default;
		return json;
	}
}
