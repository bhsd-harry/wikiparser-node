import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError} from '../index';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
export class ConverterFlagsToken extends Token {
	override readonly type = 'converter-flags';
	#flags?: string[];

	declare childNodes: AtomToken[];
	// @ts-expect-error abstract method
	abstract override get children(): AtomToken[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): ConverterRuleToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): ConverterRuleToken | undefined;

	/** @param flags 转换类型标记 */
	constructor(flags: string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: ':',
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
		const /** @implements */ converterFlagsListener: AstListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags![this.childNodes.indexOf(prevTarget as AtomToken)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
	}

	/** @override */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, ';');
	}

	/** @override */
	override text(): string {
		return super.text(';');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
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
		const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)},
			{childNodes, length} = this;
		for (let i = 0; i < length; i++) {
			const child = childNodes[i]!,
				flag = child.text().trim();
			if (flag && !variantFlags.has(flag) && !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const error = generateForChild(child, rect, 'invalid conversion flag');
				errors.push({...error, excerpt: childNodes.slice(0, i + 1).map(String).join(';').slice(-50)});
			}
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({sep: ';'});
	}
}

Parser.classes['ConverterFlagsToken'] = __filename;
