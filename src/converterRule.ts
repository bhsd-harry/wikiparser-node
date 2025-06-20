import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {AST} from '../base';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/* NOT FOR BROWSER */

import {undo, Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {html} from '../util/html';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * language conversion rule
 *
 * 转换规则
 * @classdesc `{childNodes: AtomToken[]}`
 */
export abstract class ConverterRuleToken extends Token {
	declare readonly childNodes: readonly [AtomToken]
		| readonly [AtomToken, AtomToken]
		| readonly [AtomToken, AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): ConverterFlagsToken | this | undefined;
	abstract override get nextSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): AtomToken;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousElementSibling(): ConverterFlagsToken | this | undefined;
	abstract override get nextElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'converter-rule' {
		return 'converter-rule';
	}

	/* PRINT ONLY */

	/** language variant / 语言变体 */
	get variant(): string {
		return this.childNodes[this.length - 2]?.text().trim() ?? '';
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	set variant(variant) {
		this.setVariant(variant);
	}

	/** whether to be unidirectional conversion / 是否是单向转换 */
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
				'If you want to change to unidirectional, '
				+ 'please use ConverterRuleToken.makeUnidirectional method!',
			);
		} else if (length === 1 && flag) {
			throw new Error(
				'If you want to change to unidirectional, '
				+ 'please use ConverterRuleToken.setVariant method to specify the language variant first!',
			);
		}
	}

	/** whether to be bidirectional conversion / 是否是双向转换 */
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
				'If you want to change to unidirectional, '
				+ 'please use ConverterRuleToken.makeUnidirectional method!',
			);
		} else if (length === 1 && flag) {
			throw new Error(
				'If you want to change to bidirectional, '
				+ 'please use ConverterRuleToken.setVariant method!',
			);
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
				super.insertAt(
					new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum),
					0,
				);
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-to', config, accum));
		}

		/* NOT FOR BROWSER */

		this.protectChildren('1:');
	}

	/** @private */
	override toString(skip?: boolean): string {
		const {childNodes, firstChild, lastChild} = this;
		return childNodes.length === 3
			? `${firstChild.toString(skip)}=>${childNodes[1].toString(skip)}:${lastChild.toString(skip)}`
			: super.toString(skip, ':');
	}

	/** @private */
	override text(): string {
		const {childNodes, firstChild, lastChild} = this;
		return childNodes.length === 3
			? `${firstChild.text()}=>${childNodes[1].text()}:${lastChild.text()}`
			: super.text(':');
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

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['variant'] = this.variant;
		return json;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes() as AtomToken[],
			placeholders = ['', 'zh:', '=>zh:'],
			placeholder = placeholders[cloned.length - 1]!;
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ConverterRuleToken(
				placeholder,
				Boolean(placeholder),
				this.getAttribute('config'),
			);
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
	 * @param i position of the child node / 移除位置
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

	/**
	 * Prevent language conversion
	 *
	 * 修改为不转换
	 */
	noConvert(): void {
		const {length} = this;
		for (let i = 0; i < length - 1; i++) { // ConverterRuleToken只能从前往后删除子节点
			this.removeAt(0);
		}
	}

	/**
	 * Set the target of language conversion
	 *
	 * 设置转换目标
	 * @param to target of language conversion / 转换目标
	 */
	setTo(to: string): void {
		const {childNodes} = Parser
			.parse(to, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.lastChild.safeReplaceChildren(childNodes);
	}

	/**
	 * Set the language variant
	 *
	 * 设置语言变体
	 * @param variant language variant / 语言变体
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
	 * Set the source of language conversion
	 *
	 * 设置转换原文
	 * @param from source of language conversion / 转换原文
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
			super.insertAt(
				Shadow.run(() => new AtomToken(undefined, 'converter-rule-from', config)),
				0,
			);
		}
		this.firstChild.safeReplaceChildren(childNodes);
	}

	/**
	 * Make the language conversion unidirectional
	 *
	 * 修改为单向转换
	 * @param from source of language conversion / 转换原文
	 */
	makeUnidirectional(from: string): void {
		this.setFrom(from);
	}

	/**
	 * Make the language conversion bidirectional
	 *
	 * 修改为双向转换
	 */
	makeBidirectional(): void {
		if (this.unidirectional) {
			this.removeAt(0);
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: HtmlOpt): string {
		const {childNodes, firstChild, lastChild} = this;
		return childNodes.length === 3
			? `${firstChild.toHtmlInternal(opt)}=>${childNodes[1].text()}:${
				lastChild.toHtmlInternal(opt)
			}`
			: html(childNodes, ':', opt);
	}
}

classes['ConverterRuleToken'] = __filename;
