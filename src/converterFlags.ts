import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {gapped} from '../mixin/gapped';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config, LintError} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * flags for language conversion
 *
 * 转换flags
 * @classdesc `{childNodes: AtomToken[]}`
 */
@gapped()
export abstract class ConverterFlagsToken extends Token {
	#flags?: string[];

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): undefined;
	abstract override get nextSibling(): ConverterRuleToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): AtomToken[];
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousElementSibling(): undefined;
	abstract override get nextElementSibling(): ConverterRuleToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'converter-flags' {
		return 'converter-flags';
	}

	/* NOT FOR BROWSER */

	/** all language conversion flags / 所有转换类型标记 */
	get flags(): Set<string> {
		return this.getAllFlags();
	}

	set flags(value) {
		this.replaceChildren();
		for (const flag of value) {
			this.#newFlag(flag);
		}
	}

	/* NOT FOR BROWSER END */

	/** @param flags 转换类型标记 */
	constructor(flags: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: ':',
		});
		this.safeAppend(flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
		super.afterBuild();

		/* NOT FOR BROWSER */

		const /** @implements */ converterFlagsListener: AstListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags![this.childNodes.indexOf(prevTarget as AtomToken)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, ';');
	}

	/** @private */
	override text(): string {
		return super.text(';');
	}

	/**
	 * Get unknown language conversion flags
	 *
	 * 获取未知的转换类型标记
	 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/**
	 * Get language coversion flags that specify a language variant
	 *
	 * 获取指定语言变体的转换标记
	 */
	getVariantFlags(): Set<string> {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags!.filter(flag => variants.has(flag)));
	}

	/** @private */
	isInvalidFlag(flag: string, variant: Set<string>, unknown: Set<string>, valid: Set<string>): boolean;
	/** @private */
	isInvalidFlag(child: Token): boolean;
	/** @private */
	isInvalidFlag(flag: string | Token, variant?: Set<string>, unknown?: Set<string>, valid?: Set<string>): boolean {
		/* PRINT ONLY */

		if (typeof flag === 'object') {
			flag = flag.text().trim();
			variant = this.getVariantFlags();
			unknown = this.getUnknownFlags();
			valid = new Set(this.#flags!.filter(f => definedFlags.has(f)));
		}

		/* PRINT ONLY END */

		return Boolean(flag) && !variant!.has(flag) && !unknown!.has(flag) && (variant!.size > 0 || !valid!.has(flag));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags!.filter(flag => definedFlags.has(flag))),
			emptyFlagCount = this.#flags!.filter(flag => !flag).length,
			knownFlagCount = this.#flags!.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start, re);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rule = 'no-ignored',
			s = Parser.lintConfig.getSeverity(rule, 'conversionFlag');
		if (s) {
			const rect = new BoundingRect(this, start);
			for (let i = 0; i < this.length; i++) {
				const child = this.childNodes[i]!,
					flag = child.text().trim();
				if (this.isInvalidFlag(flag, variantFlags, unknownFlags, validFlags)) {
					const e = generateForChild(child, rect, rule, 'invalid conversion flag', s);
					if (variantFlags.size === 0 && definedFlags.has(flag.toUpperCase())) {
						e.fix = {desc: 'uppercase', range: [e.startIndex, e.endIndex], text: flag.toUpperCase()};
					} else {
						e.suggestions = [{desc: 'remove', range: [e.startIndex - (i && 1), e.endIndex], text: ''}];
					}
					errors.push(e);
				}
			}
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: ';'});
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new ConverterFlagsToken([], this.getAttribute('config'));
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
	 */
	override removeAt(i: number): AtomToken {
		const token = super.removeAt(i) as AtomToken;
		this.#flags?.splice(i, 1);
		return token;
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends AtomToken>(token: T, i = this.length): T {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text().trim());
		return token;
	}

	/**
	 * Get all language conversion flags
	 *
	 * 获取所有转换类型标记
	 */
	getAllFlags(): Set<string> {
		return new Set(this.#flags);
	}

	/**
	 * Get the conversion flag token
	 *
	 * 获取转换类型标记节点
	 * @param flag language conversion flag / 转换类型标记
	 */
	getFlagTokens(flag: string): AtomToken[] {
		return this.#flags!.includes(flag) ? this.childNodes.filter(child => child.text().trim() === flag) : [];
	}

	/**
	 * Get effective language conversion flags
	 *
	 * 获取有效的转换类型标记
	 */
	getEffectiveFlags(): Set<string> {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		const flags = new Set([...this.#flags!.filter(flag => definedFlags.has(flag)), ...unknownFlags]);
		if (flags.size === 0 && variantFlags.size === 0) {
			return new Set('S');
		} else if (flags.has('R')) {
			return new Set('R');
		} else if (flags.has('N')) {
			return new Set('N');
		} else if (flags.has('-')) {
			return new Set('-');
		} else if (flags.has('H')) {
			const hasT = flags.has('T'),
				hasD = flags.has('D');
			return hasT && hasD
				? new Set(['+', 'H', 'T', 'D'])
				: new Set(['+', 'H', ...hasT ? ['T'] : [], ...hasD ? ['D'] : [], ...unknownFlags]);
		} else if (variantFlags.size > 0) {
			return new Set([...variantFlags, ...unknownFlags]);
		}
		if (flags.size === 1 && flags.has('T')) {
			flags.add('H');
		}
		if (flags.has('A')) {
			flags.add('+');
			flags.add('S');
		}
		if (flags.has('D')) {
			flags.delete('S');
		}
		return flags;
	}

	/**
	 * Check if a language conversion flag is present
	 *
	 * 是否具有某转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	hasFlag(flag: string): boolean {
		return this.#flags!.includes(flag);
	}

	/**
	 * Check if an effective language conversion flag is present
	 *
	 * 是否具有某有效的转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean {
		return this.getEffectiveFlags().has(flag);
	}

	/**
	 * Remove a language conversion flag
	 *
	 * 移除某转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	removeFlag(flag: string): void {
		for (const token of this.getFlagTokens(flag)) {
			token.remove();
		}
	}

	/**
	 * 添加转换类型标记
	 * @param flag 转换类型标记
	 */
	#newFlag(flag: string): void {
		this.insertAt(Shadow.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config'))));
	}

	/**
	 * Set a language conversion flag
	 *
	 * 设置转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	setFlag(flag: string): void {
		if (!this.#flags!.includes(flag)) {
			this.#newFlag(flag);
		}
	}

	/**
	 * Toggle a language conversion flag
	 *
	 * 开关转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	toggleFlag(flag: string): void {
		if (this.#flags!.includes(flag)) {
			this.removeFlag(flag);
		} else {
			this.#newFlag(flag);
		}
	}
}

classes['ConverterFlagsToken'] = __filename;
