import {undo} from '../util/debug';
import {noWrap} from '../util/string';
import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterRuleToken extends Token {
	/** @browser */
	override readonly type = 'converter-rule';
	declare childNodes: [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	abstract override get children(): [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get lastElementChild(): AtomToken;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousSibling(): ConverterFlagsToken | this;
	abstract override get previousElementSibling(): ConverterFlagsToken | this;
	abstract override get nextSibling(): this | undefined;
	abstract override get nextElementSibling(): this | undefined;

	/** 语言变体 */
	get variant(): string {
		return this.childNodes.at(-2)?.text()?.trim() ?? '';
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
			throw new Error('想更改为单向转换请使用 makeUnidirectional 方法！');
		} else if (length === 1 && flag) {
			throw new Error('想更改为单向转换请先使用 setVariant 方法指定语言变体！');
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
			throw new Error('想更改为单向转换请使用 makeUnidirectional 方法！');
		} else if (length === 1 && flag) {
			throw new Error('想更改为双向转换请使用 setVariant 方法！');
		}
	}

	/**
	 * @browser
	 * @param rule 转换规则
	 * @param hasColon 是否带有":"
	 */
	constructor(rule: string, hasColon = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum);
		if (hasColon) {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i);
			if (config.variants.includes(v.trim())) {
				super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
				super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
				if (j !== -1) {
					super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
				}
			} else {
				super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
		}
		this.protectChildren('1:');
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		const {childNodes} = this;
		if (childNodes.length === 3 && !(selector && this.matches(selector))) {
			const [from, variant, to] = childNodes;
			return `${from.toString(selector)}=>${variant.toString(selector)}:${to.toString(selector)}`;
		}
		return super.toString(selector, ':');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}

	/** @private */
	protected override getGaps(i: number): number {
		const {length} = this;
		return i === 0 && length === 3 ? 2 : 1;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `<span class="wpb-converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes() as AtomToken[],
			placeholders = ['', 'zh:', '=>zh:'],
			placeholder = placeholders[cloned.length - 1];
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ConverterRuleToken(placeholder, placeholder, this.getAttribute('config'));
			for (let i = 0; i < cloned.length; i++) {
				token.childNodes[i]!.safeReplaceWith(cloned[i]!);
			}
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	protected override afterBuild(): void {
		const /** @implements */ converterRuleListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (this.length > 1 && this.childNodes.at(-2) === prevTarget) {
				const v = prevTarget!.text().trim(),
					{variants} = this.getAttribute('config');
				if (!variants.includes(v)) {
					undo(e, data);
					throw new Error(`无效的语言变体：${v}`);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterRuleListener);
	}

	/**
	 * @override
	 * @param i 移除位置
	 * @throws `Error` 至少保留1个子节点
	 */
	override removeAt(i: number): AtomToken {
		if (this.length === 1) {
			throw new Error(`${this.constructor.name} 需至少保留 1 个子节点！`);
		}
		const removed = super.removeAt(i) as AtomToken;
		if (this.length === 1) {
			this.firstChild.type = 'converter-rule-noconvert';
		}
		return removed;
	}

	/**
	 * @override
	 * @throws `Error` 请勿手动插入子节点
	 */
	override insertAt(): never {
		throw new Error(`转换规则语法复杂，请勿尝试对 ${this.constructor.name} 手动插入子节点！`);
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
	 * @throws `SyntaxError` 非法的转换目标
	 */
	setTo(to: string): void {
		const config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			root = Parser.parse(`-{|${config.variants[0] ?? 'zh'}:${to}}-`, include, undefined, config),
			{length, firstChild: converter} = root;
		if (length !== 1 || converter!.type !== 'converter') {
			throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
		}
		const {lastChild: converterRule} = converter as ConverterToken;
		if (converter!.length === 2 && converterRule.length === 2) {
			const {lastChild} = converterRule as this;
			converterRule.destroy();
			this.lastChild.safeReplaceWith(lastChild);
		}
		throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
	}

	/**
	 * 设置语言变体
	 * @param variant 语言变体
	 * @throws `RangeError` 无效的语言变体
	 */
	setVariant(variant: string): void {
		const config = this.getAttribute('config'),
			v = variant.trim();
		if (!config.variants.includes(v)) {
			throw new RangeError(`无效的语言变体：${v}`);
		} else if (this.length === 1) {
			super.insertAt(Parser.run(() => new AtomToken(variant, 'converter-rule-variant', config)), 0);
		} else {
			this.childNodes.at(-2)!.setText(variant);
		}
	}

	/**
	 * 设置转换原文
	 * @param from 转换原文
	 * @throws `Error` 尚未指定语言变体
	 * @throws `SyntaxError` 非法的转换原文
	 */
	setFrom(from: string): void {
		const {variant, unidirectional} = this;
		if (!variant) {
			throw new Error('请先指定语言变体！');
		}
		const config = this.getAttribute('config'),
			root = Parser.parse(`-{|${from}=>${variant}:}-`, this.getAttribute('include'), undefined, config),
			{length, firstChild: converter} = root;
		if (length !== 1 || converter!.type !== 'converter') {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		}
		const {lastChild: converterRule} = converter as ConverterToken;
		if (converter!.length !== 2 || converterRule.length !== 3) {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		} else if (unidirectional) {
			this.firstChild.safeReplaceWith(converterRule.firstChild!);
		} else {
			super.insertAt(converterRule.firstChild!, 0);
		}
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

Parser.classes['ConverterRuleToken'] = __filename;
