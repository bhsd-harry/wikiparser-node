'use strict';
const debug_1 = require('../util/debug');
const {undo} = debug_1;
const string_1 = require('../util/string');
const {noWrap} = string_1;
const Parser = require('../index');
const Token = require('.');
const AtomToken = require('./atom');

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ConverterRuleToken extends Token {
	/** @browser */
	type = 'converter-rule';

	/** 语言变体 */
	get variant() {
		return this.childNodes.at(-2)?.text()?.trim() ?? '';
	}

	set variant(variant) {
		this.setVariant(variant);
	}

	/** 是否是单向转换 */
	get unidirectional() {
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
	get bidirectional() {
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
	constructor(rule, hasColon = true, config = Parser.getConfig(), accum = []) {
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
	toString(selector) {
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
	text() {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}

	/** @private */
	getGaps(i = 0) {
		const {length} = this,
			j = i < 0 ? i + length : i;
		return j === 0 && length === 3 ? 2 : 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `<span class="wpb-converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			placeholders = ['', 'zh:', '=>zh:'],
			placeholder = placeholders[cloned.length - 1];
		return Parser.run(() => {
			const token = new ConverterRuleToken(placeholder, placeholder, this.getAttribute('config'));
			for (let i = 0; i < cloned.length; i++) {
				token.childNodes[i].safeReplaceWith(cloned[i]);
			}
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	afterBuild() {
		const /** @implements */ converterRuleListener = (e, data) => {
			const {prevTarget} = e;
			if (this.length > 1 && this.childNodes.at(-2) === prevTarget) {
				const v = prevTarget.text().trim(),
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
	removeAt(i) {
		if (this.length === 1) {
			throw new Error(`${this.constructor.name} 需至少保留 1 个子节点！`);
		}
		const removed = super.removeAt(i);
		if (this.length === 1) {
			this.firstChild.type = 'converter-rule-noconvert';
		}
		return removed;
	}

	/**
	 * @override
	 * @throws `Error` 请勿手动插入子节点
	 */
	insertAt() {
		throw new Error(`转换规则语法复杂，请勿尝试对 ${this.constructor.name} 手动插入子节点！`);
	}

	/** 修改为不转换 */
	noConvert() {
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
	setTo(to) {
		const config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			root = Parser.parse(`-{|${config.variants[0] ?? 'zh'}:${to}}-`, include, undefined, config),
			{length, firstChild: converter} = root;
		if (length !== 1 || converter.type !== 'converter') {
			throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
		}
		const {lastChild: converterRule} = converter;
		if (converter.length !== 2 || converterRule.length !== 2) {
			throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
		}
		const {lastChild} = converterRule;
		converterRule.destroy();
		this.lastChild.safeReplaceWith(lastChild);
	}

	/**
	 * 设置语言变体
	 * @param variant 语言变体
	 * @throws `RangeError` 无效的语言变体
	 */
	setVariant(variant) {
		if (typeof variant !== 'string') {
			this.typeError('setVariant', 'String');
		}
		const config = this.getAttribute('config'),
			v = variant.trim();
		if (!config.variants.includes(v)) {
			throw new RangeError(`无效的语言变体：${v}`);
		} else if (this.length === 1) {
			super.insertAt(Parser.run(() => new AtomToken(variant, 'converter-rule-variant', config)), 0);
		} else {
			this.childNodes.at(-2).setText(variant);
		}
	}

	/**
	 * 设置转换原文
	 * @param from 转换原文
	 * @throws `Error` 尚未指定语言变体
	 * @throws `SyntaxError` 非法的转换原文
	 */
	setFrom(from) {
		const {variant, unidirectional} = this;
		if (!variant) {
			throw new Error('请先指定语言变体！');
		}
		const config = this.getAttribute('config'),
			root = Parser.parse(`-{|${from}=>${variant}:}-`, this.getAttribute('include'), undefined, config),
			{length, firstChild: converter} = root;
		if (length !== 1 || converter.type !== 'converter') {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		}
		const {lastChild: converterRule} = converter;
		if (converter.length !== 2 || converterRule.length !== 3) {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		} else if (unidirectional) {
			this.firstChild.safeReplaceWith(converterRule.firstChild);
		} else {
			super.insertAt(converterRule.firstChild, 0);
		}
	}

	/**
	 * 修改为单向转换
	 * @param from 转换原文
	 */
	makeUnidirectional(from) {
		this.setFrom(from);
	}

	/** 修改为双向转换 */
	makeBidirectional() {
		if (this.unidirectional) {
			this.removeAt(0);
		}
	}
}
Parser.classes.ConverterRuleToken = __filename;
module.exports = ConverterRuleToken;
