import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
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
	constructor(flags: readonly string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
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

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** 获取未知的转换类型标记 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/** 获取指定语言变体的转换标记 */
	getVariantFlags(): Set<string> {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags!.filter(flag => variants.has(flag)));
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
		const rect = new BoundingRect(this, start),
			{childNodes, length} = this;
		for (let i = 0; i < length; i++) {
			const child = childNodes[i]!,
				flag = child.text().trim();
			if (
				flag
				&& !variantFlags.has(flag)
				&& !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const e = generateForChild(child, rect, 'no-ignored', 'invalid conversion flag');
				if (variantFlags.size === 0 && definedFlags.has(flag.toUpperCase())) {
					e.fix = {
						range: [e.startIndex, e.endIndex],
						text: flag.toUpperCase(),
					};
				} else {
					e.suggestions = [
						{
							desc: 'remove',
							range: [e.startIndex, e.endIndex],
							text: '',
						},
					];
				}
				errors.push(e);
			}
		}
		return errors;
	}
}
