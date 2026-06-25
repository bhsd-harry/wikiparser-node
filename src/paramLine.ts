import {generateForSelf, fixByRemove} from '../util/lint';
import {extParams} from '../util/sharable';
import {gapped} from '../mixin/gapped';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config, LintError, TokenTypes} from '../base';
import type {ParamTagToken, FuncTagToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

const skipTypes = new Set<TokenTypes | 'text'>(['comment', 'include', 'noinclude']);

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 * @classdesc `{childNodes: [AtomToken] | [AtomToken, AtomToken]}`
 */
@gapped()
export abstract class ParamLineToken extends Token {
	#delimiter;

	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ParamTagToken | FuncTagToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, AtomToken];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): AtomToken;
	abstract override get parentElement(): ParamTagToken | FuncTagToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'param-line' {
		return 'param-line';
	}

	/** A reasonable parameter name / 合理的参数名 */
	get key(): string | undefined {
		LINT: return this.getKey();
	}

	/* NOT FOR BROWSER */

	set key(key: string) {
		this.setKey(key);
	}

	/** Parameter value / 参数值 */
	get value(): string | undefined {
		return this.getValue();
	}

	set value(value: string) {
		this.setValue(value);
	}

	/* NOT FOR BROWSER END */

	/** @param name 扩展标签名 */
	constructor(
		name: string,
		wikitext: string,
		delimiter: '\n' | '|',
		config: Config,
		accum: Token[],
		// eslint-disable-next-line unicorn/no-object-as-default-parameter
		acceptable: WikiParserAcceptable = {
			AstText: ':',
		},
	) {
		super(undefined, config, accum, {
			AtomToken: '0:2',
		});
		this.#delimiter = delimiter;
		this.setAttribute('name', name);
		const equal = wikitext.indexOf('=');
		if (equal === -1) {
			this.insertAt(new AtomToken(wikitext, 'param-line-key', config, accum, acceptable));
		} else {
			this.append(
				new AtomToken(wikitext.slice(0, equal), 'param-line-key', config, accum, acceptable),
				new AtomToken(wikitext.slice(equal + 1), 'param-line-value', config, accum, acceptable),
			);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '=');
	}

	/** @private */
	override text(): string {
		return this.childNodes.map(child => child.text().trim()).join('=');
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				{lintConfig} = Parser,
				{name, length, firstChild: {childNodes}, previousSibling} = this,
				s = lintConfig.getSeverity(rule, name);
			if (!s) {
				return [];
			}
			const children = childNodes.filter(({type}) => !skipTypes.has(type)),
				i = children.findIndex(({type}) => type !== 'text');
			let key = children.slice(0, i === -1 ? undefined : i).map(String).join('').trim(),
				wrong = false;
			if (childNodes.some(({type}) => type === 'ext') || length === 1 && i === -1 && key) {
				wrong = true;
			} else if (key || length === 2) {
				if (name === 'inputbox') {
					key = key.toLowerCase();
				}
				const params = extParams[name]!;
				if (
					i === -1
						? !params.some(
							p => p === key
								|| p.endsWith('$1') && key.startsWith(p.slice(0, -2)),
						)
						: !params.some(p => p.startsWith(key))
				) {
					wrong = true;
				}
			}
			if (wrong) {
				const e = generateForSelf(this, {start}, rule, Parser.msg('invalid-parameter', name), s);
				if (lintConfig.computeEditInfo) {
					e.suggestions = [fixByRemove(e, previousSibling ? -1 : 0)];
				}
				return [e];
			}
			return super.lint(start, false);
		}
	}

	/**
	 * Get a reasonable parameter name
	 *
	 * 获取合理的参数名
	 */
	getKey(): string | undefined {
		LINT: {
			const {length, firstChild: {childNodes}, name} = this,
				isInputbox = name === 'inputbox';
			return length === 1 || childNodes.some(({type}) => type === 'ext')
				? undefined
				: childNodes.map(child => isInputbox && child.type === 'text' ? child.data.toLowerCase() : child.text())
					.join('')
					.trim();
		}
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({sep: '='});
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		const token: this = new ParamLineToken(
			this.name,
			'',
			this.#delimiter,
			this.getAttribute('config'),
		);
		token.removeAt(0);
		return token;
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string | undefined {
		const {length, lastChild} = this;
		return length === 1 ? undefined : lastChild.text().trim();
	}

	/**
	 * Set the parameter name
	 *
	 * 设置参数名
	 * @param key The parameter name / 参数名
	 */
	setKey(key: string): void {
		const {length, firstChild} = this;
		if (length === 1) {
			this.prepend(new AtomToken(
				key,
				'param-line-key',
				this.getAttribute('config'),
				[],
				firstChild.getAcceptable(),
			));
			firstChild.type = 'param-line-value';
		} else {
			firstChild.replaceChildren(key);
		}
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param value The parameter value / 参数值
	 */
	setValue(value: string): void {
		const {length, lastChild} = this;
		if (length === 1) {
			this.insertAt(new AtomToken(
				value,
				'param-line-value',
				this.getAttribute('config'),
				[],
				lastChild.getAcceptable(),
			));
		} else {
			lastChild.replaceChildren(value);
		}
	}
}

classes['ParamLineToken'] = __filename;
