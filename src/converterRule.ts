import {undo, Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterRuleToken extends Token {
	declare readonly childNodes: readonly [AtomToken]
	| readonly [AtomToken, AtomToken]
	| readonly [AtomToken, AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): ConverterFlagsToken | this;
	abstract override get nextSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): AtomToken;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousElementSibling(): ConverterFlagsToken | this;
	abstract override get nextElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'converter-rule' {
		return 'converter-rule';
	}

	/* NOT FOR BROWSER */

	/** 语言变体 */
	get variant(): string {
		return this.childNodes[this.length - 2]?.text().trim() ?? '';
	}

	set variant(variant) {
		this.setVariant(variant);
	}

	/** 是否是单向转换 */
	get unidirectional(): boolean {
		return this.length === 3;
	}

	/** @throws `Error` 不能用于将双向转换或不转换更改为单向转换 */
	set unidirectional(flag) {
		const {length} = this;
		if (length === 3 && !flag) {
			this.makeBidirectional();
		} else if (length === 2 && flag) {
			throw new Error(
				'If you want to change to unidirectional, please use ConverterRuleToken.makeUnidirectional method!',
			);
		} else if (length === 1 && flag) {
			throw new Error(
				'If you want to change to unidirectional, '
				+ 'please use ConverterRuleToken.setVariant method to specify the language variant first!',
			);
		}
	}

	/** 是否是双向转换 */
	get bidirectional(): boolean {
		return this.length === 2;
	}

	/** @throws `Error` 不能用于将双向转换更改为单向转换或将不转换更改为双向转换 */
	set bidirectional(flag) {
		const {length} = this;
		if (length === 3 && flag) {
			this.makeBidirectional();
		} else if (length === 2 && !flag) {
			throw new Error(
				'If you want to change to unidirectional, please use ConverterRuleToken.makeUnidirectional method!',
			);
		} else if (length === 1 && flag) {
			throw new Error('If you want to change to bidirectional, please use ConverterRuleToken.setVariant method!');
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param rule 转换规则
	 * @param hasColon 是否带有":"
	 */
	constructor(rule: string, hasColon = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		const i = rule.indexOf(':'),
			j = rule.slice(0, i).indexOf('=>'),
			v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i);
		if (hasColon && config.variants.includes(v.trim())) {
			super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
			super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
			if (j !== -1) {
				super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-to', config, accum));
		}

		/* NOT FOR BROWSER */

		this.protectChildren('1:');
	}

	/** @private */
	override toString(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.toString()}=>${variant.toString()}:${to.toString()}`;
		}
		return super.toString(':');
	}

	/** @private */
	override text(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}

	/** @private */
	override getGaps(i: number): number {
		return i === 0 && this.length === 3 ? 2 : 1;
	}

	/** @private */
	override print(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `<span class="wpb-converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes() as AtomToken[],
			placeholders = ['', 'zh:', '=>zh:'],
			placeholder = placeholders[cloned.length - 1]!;
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ConverterRuleToken(
				placeholder,
				Boolean(placeholder),
				this.getAttribute('config'),
			) as this;
			for (let i = 0; i < cloned.length; i++) {
				token.childNodes[i]!.safeReplaceWith(cloned[i]!);
			}
			return token;
		});
	}

	/** @private */
	override afterBuild(): void {
		super.afterBuild();
		const /** @implements */ converterRuleListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (this.length > 1 && this.childNodes[this.length - 2] === prevTarget) {
				const {variant} = this;
				if (!this.getAttribute('config').variants.includes(variant)) {
					undo(e, data);
					throw new Error(`Invalid language variant: ${variant}`);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterRuleListener);
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): AtomToken {
		if (this.length === 1) {
			this.constructorError('needs at least 1 child node');
		}
		return super.removeAt(i) as AtomToken;
	}

	override insertAt(): never {
		this.constructorError('has complex syntax. Do not try to insert child nodes manually');
	}

	/** 修改为不转换 */
	noConvert(): void {
		const {length} = this;
		for (let i = 0; i < length - 1; i++) { // ConverterRuleToken只能从前往后删除子节点
			this.removeAt(0);
		}
	}

	/**
	 * 设置转换目标
	 * @param to 转换目标
	 */
	setTo(to: string): void {
		const {childNodes} = Parser.parse(to, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.lastChild.replaceChildren(...childNodes);
	}

	/**
	 * 设置语言变体
	 * @param variant 语言变体
	 */
	setVariant(variant: string): void {
		const config = this.getAttribute('config');
		if (this.length === 1) {
			super.insertAt(Shadow.run(() => new AtomToken(variant, 'converter-rule-variant', config)), 0);
		} else {
			this.childNodes[this.length - 2]!.setText(variant);
		}
	}

	/**
	 * 设置转换原文
	 * @param from 转换原文
	 * @throws `Error` 尚未指定语言变体
	 */
	setFrom(from: string): void {
		const {variant, unidirectional} = this;
		if (!variant) {
			throw new Error('Please specify the language variant first!');
		}
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(from, this.getAttribute('include'), undefined, config);
		if (!unidirectional) {
			super.insertAt(Shadow.run(() => new AtomToken(undefined, 'converter-rule-from', config)), 0);
		}
		this.firstChild.replaceChildren(...childNodes);
	}

	/**
	 * 修改为单向转换
	 * @param from 转换原文
	 */
	makeUnidirectional(from: string): void {
		this.setFrom(from);
	}

	/** 修改为双向转换 */
	makeBidirectional(): void {
		if (this.unidirectional) {
			this.removeAt(0);
		}
	}
}

classes['ConverterRuleToken'] = __filename;
