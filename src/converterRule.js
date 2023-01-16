'use strict';

const {undo} = require('../util/debug'),
	{noWrap} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken)}`
 */
class ConverterRuleToken extends Token {
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
		return this.childNodes.length === 3;
	}

	set unidirectional(unidirectional) {
		if (unidirectional === false) {
			this.makeBidirectional();
		}
	}

	/** 是否是双向转换 */
	get bidirectional() {
		return this.childNodes.length === 2;
	}

	/**
	 * @param {string} rule 转换规则
	 * @param {boolean} hasColon 是否带有":"
	 * @param {accum} accum
	 */
	constructor(rule, hasColon = true, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		if (hasColon) {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i),
				{variants} = config;
			if (variants.includes(v.trim())) {
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
		this.getAttribute('protectChildren')('1:');
	}

	/**
	 * @override
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		if (this.childNodes.length === 3 && !(selector && this.matches(selector))) {
			const {childNodes: [from, variant, to]} = this;
			return `${from.toString(selector)}=>${variant.toString(selector)}:${to.toString(selector)}`;
		}
		return super.toString(selector, ':');
	}

	/**
	 * @override
	 * @param {number} i 子节点序号
	 */
	getGaps(i = 0) {
		const {length} = this;
		i = i < 0 ? i + length : i;
		return i === 0 && length === 3 ? 2 : 1;
	}

	/** @override */
	print() {
		if (this.childNodes.length === 3) {
			const {childNodes: [from, variant, to]} = this;
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

	/** @override */
	afterBuild() {
		const /** @type {AstListener} */ converterRuleListener = (e, data) => {
			const {childNodes} = this,
				{prevTarget} = e;
			if (childNodes.length > 1 && childNodes.at(-2) === prevTarget) {
				const v = prevTarget.text().trim(),
					{variants} = this.getAttribute('config');
				if (!variants.includes(v)) {
					undo(e, data);
					throw new Error(`无效的语言变体：${v}`);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterRuleListener);
		return this;
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @returns {AtomToken}
	 * @throws `Error` 至少保留1个子节点
	 */
	removeAt(i) {
		if (this.childNodes.length === 1) {
			throw new Error(`${this.constructor.name} 需至少保留 1 个子节点！`);
		}
		const removed = super.removeAt(i);
		if (this.childNodes.length === 1) {
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

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		if (this.childNodes.length === 3) {
			const {childNodes: [from, variant, to]} = this;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
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
	 * @param {string} to 转换目标
	 * @throws `SyntaxError` 非法的转换目标
	 */
	setTo(to) {
		to = String(to);
		const config = this.getAttribute('config'),
			root = Parser.parse(`-{|${config.variants[0]}:${to}}-`, this.getAttribute('include'), undefined, config),
			{length, firstChild: converter} = root,
			{lastChild: converterRule, type, length: converterLength} = converter;
		if (length !== 1 || type !== 'converter' || converterLength !== 2 || converterRule.childNodes.length !== 2) {
			throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
		}
		const {lastChild} = converterRule;
		converterRule.destroy(true);
		this.lastChild.safeReplaceWith(lastChild);
	}

	/**
	 * 设置语言变体
	 * @param {string} variant 语言变体
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
		} else if (this.childNodes.length === 1) {
			super.insertAt(Parser.run(() => new AtomToken(variant, 'converter-rule-variant', config)), 0);
		} else {
			this.childNodes.at(-2).setText(variant);
		}
	}

	/**
	 * 设置转换原文
	 * @param {string} from 转换原文
	 * @throws `Error` 尚未指定语言变体
	 * @throws `SyntaxError` 非法的转换原文
	 */
	setFrom(from) {
		const {variant, unidirectional} = this;
		if (!variant) {
			throw new Error('请先指定语言变体！');
		}
		from = String(from);
		const config = this.getAttribute('config'),
			root = Parser.parse(`-{|${from}=>${variant}:}-`, this.getAttribute('include'), undefined, config),
			{length, firstChild: converter} = root,
			{type, length: converterLength, lastChild: converterRule} = converter;
		if (length !== 1 || type !== 'converter' || converterLength !== 2 || converterRule.childNodes.length !== 3) {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		} else if (unidirectional) {
			this.firstChild.safeReplaceWith(converterRule.firstChild);
		} else {
			super.insertAt(converterRule.firstChild, 0);
		}
	}

	/**
	 * 修改为单向转换
	 * @param {string} from 转换来源
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
