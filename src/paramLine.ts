import {generateForSelf, fixByRemove} from '../util/lint';
import {extParams} from '../util/sharable';
import {gapped} from '../mixin/gapped';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config, LintError, TokenTypes} from '../base';
import type {ParamTagToken, FuncTagToken} from '../internal';

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

	override get type(): 'param-line' {
		return 'param-line';
	}

	/** A reasonable parameter name / 合理的参数名 */
	get key(): string | undefined {
		LINT: return this.getKey();
	}

	/** @param name 扩展标签名 */
	constructor(
		name: string,
		wikitext: string,
		delimiter: '\n' | '|',
		config: Config,
		accum: Token[],
		acceptable: WikiParserAcceptable = {
		},
	) {
		super(undefined, config, accum, {
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

	/**
	 * 转义字符串以规避参数分隔符
	 * @param str 待转义的字符串
	 */
	#escape(str: string): string {
		return this.#delimiter === '\n'
			? str.replace(/\n/gu, ' ')
			: str.replace(/\|/gu, '{{!}}');
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.childNodes.map(
			({childNodes}) => childNodes.map(child => {
				const str = child.toString(skip);
				return child.type === 'text' ? this.#escape(str) : str;
			}).join(''),
		).join('=');
	}

	/** @private */
	override text(): string {
		return this.childNodes.map(
			({childNodes}) => childNodes.map(child => {
				const str = child.text();
				return child.type === 'text' ? this.#escape(str) : str;
			}).join('').trim(),
		).join('=');
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
}
