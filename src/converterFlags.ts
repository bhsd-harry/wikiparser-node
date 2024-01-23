import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
export class ConverterFlagsToken extends Token {
	override readonly type = 'converter-flags';
	#flags?: string[];

	declare readonly childNodes: readonly AtomToken[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): ConverterRuleToken | undefined;

	/** @param flags 转换类型标记 */
	constructor(flags: readonly string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, ';');
	}

	/** @override */
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

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags!.filter(flag => definedFlags.has(flag))),
			{length: emptyFlagCount} = this.#flags!.filter(flag => !flag),
			knownFlagCount = this.#flags!.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)!},
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
				errors.push(generateForChild(child, rect, 'invalid conversion flag'));
			}
		}
		return errors;
	}
}
