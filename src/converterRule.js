'use strict';

const {undo} = require('../util/debug'),
	{noWrap} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken)}`
 */
class ConverterRuleToken extends Token {
	type = 'converter-rule';
	variant = '';
	unidirectional = false;
	bidirectional = false;

	/**
	 * @param {string} rule
	 * @param {accum} accum
	 */
	constructor(rule, hasColon = true, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: ':'});
		if (hasColon) {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = (j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i)).trim(),
				{variants} = config;
			if (variants.includes(v)) {
				super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
				super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
				if (j === -1) {
					this.bidirectional = true;
				} else {
					super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
					this.unidirectional = true;
				}
			} else {
				super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
		}
		this.seal(['variant', 'unidirectional', 'bidirectional']);
	}

	cloneNode() {
		const cloned = this.cloneChildren(),
			placeholders = ['', 'zh:', '=>zh:'],
			placeholder = placeholders[cloned.length - 1],
			token = Parser.run(() => new ConverterRuleToken(placeholder, placeholder, this.getAttribute('config')));
		for (let i = 0; i < cloned.length; i++) {
			token.children[i].safeReplaceWith(cloned[i]);
		}
		token.afterBuild();
		return token;
	}

	afterBuild() {
		if (this.childNodes.length > 1) {
			this.setAttribute('variant', this.children.at(-2).text().trim());
		}
		const /** @type {AstListener} */ converterRuleListener = (e, data) => {
			const {childNodes} = this,
				{prevTarget} = e;
			if (childNodes.length > 1 && childNodes.at(-2) === prevTarget) {
				const v = prevTarget.text().trim(),
					{variants} = this.getAttribute('config');
				if (variants.includes(v)) {
					this.setAttribute('variant', v);
				} else {
					undo(e, data);
					throw new Error(`无效的语言变体：${v}`);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterRuleListener);
		return this;
	}

	/**
	 * @param {number} i
	 * @returns {AtomToken}
	 */
	removeAt(i) {
		if (i !== 0 && i !== -this.childNodes.length) {
			throw new RangeError(`${this.constructor.name} 禁止移除第 ${i} 个子节点！`);
		}
		return super.removeAt(i);
	}

	insertAt() {
		throw new Error(`转换规则语法复杂，请勿尝试对 ${this.constructor.name} 手动插入子节点！`);
	}

	/** @returns {string} */
	toString() {
		if (this.childNodes.length === 3) {
			const {children: [from, variant, to]} = this;
			return `${from.toString()}=>${variant.toString()}:${to.toString()}`;
		}
		return super.toString(':');
	}

	/** @param {number} i */
	getGaps(i = 0) {
		const {childNodes: {length}} = this;
		i = i < 0 ? i + length : i;
		return i === 0 && length === 3 ? 2 : 1;
	}

	/** @returns {string} */
	text() {
		if (this.childNodes.length === 3) {
			const {children: [from, variant, to]} = this;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}

	noConvert() {
		for (let i = this.childNodes.length - 2; i >= 0; i--) {
			super.removeAt(i);
		}
		this.setAttribute('unidirectional', false).setAttribute('bidirectional', false).setAttribute('variant', '');
	}

	/** @param {string} to */
	setTo(to) {
		to = String(to);
		const config = this.getAttribute('config'),
			root = Parser.parse(`-{|${config.variants[0]}:${to}}-`, this.getAttribute('include'), undefined, config),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild.type !== 'converter' || firstElementChild.childNodes.length !== 2
			|| firstElementChild.lastElementChild.childNodes.length !== 2
		) {
			throw new SyntaxError(`非法的转换目标：${noWrap(to)}`);
		}
		const {lastElementChild} = firstElementChild,
			{lastChild} = lastElementChild;
		lastElementChild.removeAt(0);
		this.lastElementChild.safeReplaceWith(lastChild);
	}

	/** @param {string} variant */
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
			this.setAttribute('bidirectional', true);
		} else {
			this.children.at(-2).setText(variant);
		}
		this.setAttribute('variant', v);
	}

	/**
	 * @param {string} from
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
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild.type !== 'converter' || firstElementChild.childNodes.length !== 2
			|| firstElementChild.lastElementChild.childNodes.length !== 3
		) {
			throw new SyntaxError(`非法的转换原文：${noWrap(from)}`);
		}
		if (unidirectional) {
			this.firstElementChild.safeReplaceWith(firstElementChild.lastElementChild.firstChild);
		} else {
			super.insertAt(firstElementChild.lastElementChild.firstChild, 0);
			this.setAttribute('unidirectional', true).setAttribute('bidirectional', false);
		}
	}

	/** @param {string} from */
	makeUnidirectional(from) {
		this.setFrom(from);
	}

	makeBidirectional() {
		if (this.unidirectional) {
			super.removeAt(0);
			this.setAttribute('unidirectional', false).setAttribute('bidirectional', true);
		}
	}
}

Parser.classes.ConverterRuleToken = __filename;
module.exports = ConverterRuleToken;
