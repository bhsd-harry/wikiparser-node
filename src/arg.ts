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
	AST,
} from '../base';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

	override get type(): 'arg' {
		return 'arg';
	}

	/* PRINT ONLY */

	/** default value / 预设值 */
	get default(): string | false {
		LSP: return this.childNodes[1]?.text() ?? false; // eslint-disable-line no-unused-labels
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	set default(value) {
		this.setDefault(value);
	}

	/* NOT FOR BROWSER END */

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: 0, Token: 1, HiddenToken: '2:',
		});
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			if (i === 0) {
				const token = new AtomToken(part, 'arg-name', config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
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

		/* NOT FOR BROWSER */

		this.protectChildren(0);
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

		/* NOT FOR BROWSER */

		const /** @implements */ argListener: AstListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.#setName();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
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
				s = rules.map(rule => Parser.lintConfig.getSeverity(rule, 'arg') as LintError.Severity);
			if (s[0] && rest.length > 0) {
				const rect = new BoundingRect(this, start);
				errors.push(...rest.map(child => {
					const e = generateForChild(child, rect, rules[0], 'invisible-triple-braces', s[0]);
					e.startIndex--;
					e.startCol--;
					e.suggestions = [
						fixByRemove(e),
						fixByEscape(e.startIndex, '{{!}}'),
					];
					return e;
				}));
			}
			if (s[1] && !this.getAttribute('include')) {
				const e = generateForSelf(this, {start}, rules[1], 'unexpected-argument', s[1]);
				if (argDefault) {
					e.suggestions = [fixBy(e, 'expand', argDefault.text())];
				}
				errors.push(e);
			}
			return errors;
		}
	}

	/** @private */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		LSP: { // eslint-disable-line no-unused-labels
			json['default'] = this.default;
			return json;
		}
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
	 * Remove redundant parts
	 *
	 * 移除无效部分
	 */
	removeRedundant(): void {
		Shadow.run(() => {
			for (let i = this.length - 1; i > 1; i--) {
				super.removeAt(i);
			}
		});
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
	 */
	override removeAt(i: number): Token {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i) as Token;
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		if (Shadow.running) {
			//
		} else if (i > 1) {
			this.constructorError('cannot insert redundant child nodes');
		} else if (typeof token === 'string') {
			this.constructorError('cannot insert text nodes');
		}
		super.insertAt(token, i);
		if (i === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * Set the argument name
	 *
	 * 设置参数名
	 * @param name new argument name / 新参数名
	 */
	setName(name: string): void {
		const {childNodes} = Parser
			.parse(name, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.firstChild.safeReplaceChildren(childNodes);
	}

	/**
	 * Set the default value
	 *
	 * 设置预设值
	 * @param value default value / 预设值
	 */
	setDefault(value: string | false): void {
		if (value === false) {
			this.removeAt(1);
			return;
		}
		const root = Parser
				.parse(value, this.getAttribute('include'), undefined, this.getAttribute('config')),
			{childNodes: [, oldDefault]} = this;
		if (oldDefault) {
			oldDefault.safeReplaceChildren(root.childNodes);
		} else {
			root.type = 'arg-default';
			this.insertAt(root);
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: HtmlOpt): string {
		if (this.length === 1) {
			const html = this.toString();
			return opt?.nowrap ? html.replaceAll('\n', ' ') : html;
		}
		return this.childNodes[1]!.toHtmlInternal(opt);
	}
}

classes['ArgToken'] = __filename;
