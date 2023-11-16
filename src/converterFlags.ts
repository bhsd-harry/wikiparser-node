import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import type {LintError} from '../index';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterFlagsToken extends Token {
	/** @browser */
	override readonly type = 'converter-flags';
	declare childNodes: AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): undefined;
	abstract override get nextSibling(): ConverterRuleToken | undefined;

	/** @browser */
	#flags?: string[];

	/**
	 * @browser
	 * @param flags 转换类型标记
	 */
	constructor(flags: string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	protected override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return super.toString(selector, ';');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return super.text(';');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * 获取未知的转换类型标记
	 * @browser
	 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/**
	 * 获取指定语言变体的转换标记
	 * @browser
	 */
	getVariantFlags(): Set<string> {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags!.filter(flag => variants.has(flag)));
	}

	/**
	 * @override
	 * @browser
	 */
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
		const rect = {start, ...this.getRootNode().posFromIndex(start)},
			{childNodes, length} = this;
		for (let i = 0; i < length; i++) {
			const child = childNodes[i]!,
				flag = child.text().trim();
			if (flag && !variantFlags.has(flag) && !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const error = generateForChild(child, rect, 'invalid conversion flag');
				errors.push(error);
			}
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({sep: ';'});
	}
}
