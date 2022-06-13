'use strict';

const {typeError} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [AtomToken, Token]}`
 */
class ParameterToken extends fixedToken(Token) {
	type = 'parameter';
	anon;

	/**
	 * @param {string|number} key
	 * @param {string} value
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		if (!['string', 'number'].includes(typeof key)) {
			typeError('String', 'Number');
		}
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		this.anon = typeof key === 'number';
		const AtomToken = require('./atomToken'),
			keyToken = new AtomToken(this.anon ? undefined : key, 'parameter-key', accum, {
				String: ':', CommentToken: ':', NoincludeToken: ':', IncludeToken: ':',
				ExtToken: ':', ArgToken: ':', TranscludeToken: ':',
			});
		const token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		token.setAttribute('stage', 2);
		this.append(keyToken, token);
		if (this.type === 'magic-word') {
			return;
		}
		const that = this;
		/**
		 * 在AstEventData中记录`oldKey`和`newKey`
		 * @type {AstListener}
		 */
		const parameterListener = ({prevTarget}, data) => {
			if (that.anon || !that.name) { // 匿名参数不管怎么变动还是匿名
				return;
			}
			const {firstChild} = that;
			if (prevTarget === firstChild) {
				const newKey = firstChild.text().trim();
				data.oldKey = that.name;
				data.newKey = newKey;
				that.setAttribute('name', newKey);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
	}

	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	text() {
		return this.anon ? this.lastElementChild.text() : super.text('=');
	}

	plain() {
		return this.lastElementChild.plain();
	}

	afterBuild() {
		if (!this.anon) {
			const name = this.firstElementChild.text().trim(),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode && parentNode instanceof require('./transcludeToken')) {
				const keys = parentNode.getAttribute('keys'),
					args = parentNode.getArgs(name, false);
				keys.add(name);
				args.add(this);
			}
		}
		return super.afterBuild();
	}

	/** @param {ParameterToken} token */
	safeReplaceWith(token) {
		Parser.warn(`${this.constructor.name}.safeReplaceWith 方法退化到 replaceWith。`);
		return this.replaceWith(token);
	}

	getValue() {
		const value = this.lastElementChild.text(),
			/** @type {{parentNode: Token}} */ {parentNode} = this;
		return this.anon && parentNode?.isTemplate() ? value : value.trim();
	}

	/** @param {string} value */
	setValue(value) {
		value = String(value);
		const /** @type {{anon: boolean, parentNode: Token}} */ {anon, parentNode} = this,
			templateLike = parentNode.isTemplate(),
			root = new Token(
				`{{${templateLike ? ':T|' : 'lc:'}${anon ? '' : '1='}${value}}}`,
				this.getAttribute('config'),
			).parse(2),
			{childNodes: {length}, firstElementChild} = root,
			/** @type {ParameterToken} */ lastElementChild = firstElementChild?.lastElementChild;
		if (length !== 1 || !firstElementChild?.matches(templateLike ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2
			|| lastElementChild.anon !== anon || lastElementChild.name !== '1'
		) {
			throw new SyntaxError(`非法的模板参数：${value.replaceAll('\n', '\\n')}`);
		}
		const /** @type {Token} */ oldValue = this.lastChild,
			newValue = lastElementChild.lastChild;
		root.destroy();
		firstElementChild.destroy();
		lastElementChild.destroy();
		oldValue.safeReplaceWith(newValue);
	}

	/** @param {string} key */
	rename(key, force = false) {
		if (typeof key !== 'string') {
			typeError('String');
		}
		const TranscludeToken = require('./transcludeToken'),
			/** @type {ParameterToken & {firstChild: Token}} */ {parentNode, firstChild} = this;
		if (!(parentNode instanceof TranscludeToken) || !parentNode.isTemplate()) { // 必须检测是否是TranscludeToken
			throw new Error(`${this.constructor.name}.rename 方法仅用于模板参数！`);
		}
		const root = new Token(`{{:T|${key}=}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('template#T') || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的模板参数名：${key}`);
		}
		const {lastElementChild} = firstElementChild,
			{name} = lastElementChild,
			keyToken = lastElementChild.firstChild;
		if (this.name === name) {
			Parser.warn('未改变实际参数名', name);
		} else if (parentNode.hasArg(name)) {
			if (force) {
				Parser.warn('参数更名造成重复参数', name);
			} else {
				throw new RangeError(`参数更名造成重复参数：${name}`);
			}
		}
		root.destroy();
		firstElementChild.destroy();
		lastElementChild.destroy();
		firstChild.safeReplaceWith(keyToken);
	}
}

Parser.classes.ParameterToken = __filename;
module.exports = ParameterToken;
