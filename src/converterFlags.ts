import {generateForChild, fixByRemove, fixByUpper} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {gapped} from '../mixin/gapped';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config, LintError} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

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

	override get type(): 'converter-flags' {
		return 'converter-flags';
	}

	/** @param flags 转换类型标记 */
	constructor(flags: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.safeAppend(flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
		super.afterBuild();
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
	// eslint-disable-next-line @typescript-eslint/class-methods-use-this
	isInvalidFlag(flag: string | Token, variant?: Set<string>, unknown?: Set<string>, valid?: Set<string>): boolean {
		// @ts-expect-error flag is string
		return Boolean(flag) && !variant!.has(flag) && !unknown!.has(flag) && (variant!.size > 0 || !valid!.has(flag));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
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
						const e = generateForChild(child, rect, rule, 'invalid-conversion-flag', s);
						if (variantFlags.size === 0 && definedFlags.has(flag.toUpperCase())) {
							e.fix = fixByUpper(e, flag);
						} else {
							e.suggestions = [fixByRemove(e, i && -1)];
						}
						errors.push(e);
					}
				}
			}
			return errors;
		}
	}
}
