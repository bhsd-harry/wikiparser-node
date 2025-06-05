import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {gapped} from '../mixin/gapped';
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
	isInvalidFlag(
		child: AtomToken,
		variant?: Set<string>,
		unknown?: Set<string>,
		valid?: Set<string>,
		flag?: string,
	): boolean {
		variant ??= this.getVariantFlags();
		unknown ??= this.getUnknownFlags();
		valid ??= new Set(this.#flags!.filter(f => definedFlags.has(f)));
		flag ??= child.text().trim();
		return Boolean(flag) && !variant.has(flag) && !unknown.has(flag) && (variant.size > 0 || !valid.has(flag));
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
		const rect = new BoundingRect(this, start);
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				flag = child.text().trim();
			if (this.isInvalidFlag(child, variantFlags, unknownFlags, validFlags, flag)) {
				const e = generateForChild(child, rect, 'no-ignored', 'invalid conversion flag');
				if (variantFlags.size === 0 && definedFlags.has(flag.toUpperCase())) {
					e.fix = {range: [e.startIndex, e.endIndex], text: flag.toUpperCase(), desc: 'uppercase'};
				} else {
					e.suggestions = [{desc: 'remove', range: [e.startIndex - (i && 1), e.endIndex], text: ''}];
				}
				errors.push(e);
			}
		}
		return errors;
	}
}
