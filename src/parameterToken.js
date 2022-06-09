'use strict';

const {typeError} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	AtomToken = require('./atomToken'),
	TranscludeToken = require('./transcludeToken'); // eslint-disable-line no-unused-vars

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
		super(null, config, true, accum, {AtomToken: 0, Token: 1});
		this.anon = typeof key === 'number';
		const keyToken = new AtomToken(this.anon ? null : key, 'parameter-key', accum, {
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
		/**
		 * 在AstEventData中记录oldKey和newKey
		 * @type {AstListener}
		 */
		const parameterListener = ({prevTarget}, data) => {
			if (this.anon || !this.name) { // 匿名参数不管怎么变动还是匿名
				return;
			}
			const /** @type {{firstChild: Token}} */ {firstChild} = this;
			if (prevTarget === firstChild) {
				const newKey = firstChild.text().trim();
				data.oldKey = this.name;
				data.newKey = newKey;
				this.setAttribute('name', newKey);
			}
		};
		this.addEventListener('remove', parameterListener);
		this.addEventListener('insert', parameterListener);
		this.addEventListener('replace', parameterListener);
	}

	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	text() {
		return this.anon ? this.lastElementChild.text() : super.text('=');
	}

	afterBuild() {
		if (!this.anon) {
			const name = this.firstElementChild.text().trim(),
				/** @type {{parentNode: TranscludeToken}} */ {parentNode} = this;
			this.setAttribute('name', name);
			const /** @type {Set<string>} */ keys = parentNode.getAttribute('keys'),
				args = parentNode.getArgs(name, false);
			keys.add(name);
			args.add(this);
		}
		return super.afterBuild();
	}

	/** @param {ParameterToken} token */
	safeReplaceWith(token) {
		Parser.warn(`${this.constructor.name}.safeReplaceWith 方法退化到 replaceWith。`);
		return this.replaceWith(token);
	}

	getValue() {
		const value = this.lastElementChild.text();
		return !this.anon || this.parentNode?.type !== 'template' ? value.trim() : value;
	}

	setValue(value) {
		const {anon} = this,
			isTemplate = this.parentNode?.type === 'template',
			root = new Token(
				`{{${isTemplate ? ':T|' : 'lc:'}${anon ? '' : '1='}${String(value)}}}`,
				this.getAttribute('config'),
			).parse(2),
			{childNodes: {length}, firstElementChild} = root,
			/** @type {{lastElementChild: ParameterToken}} */ {lastElementChild} = firstElementChild;
		if (length !== 1 || !firstElementChild.matches(isTemplate ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2
			|| lastElementChild.anon !== anon || lastElementChild.name !== '1'
		) {
			throw new SyntaxError(`非法的模板参数：${String(value).replaceAll('\n', '\\n')}`);
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
		} else if (this.parentNode?.type !== 'template') {
			throw new Error(`${this.constructor.name}.rename 方法仅用于模板参数！`);
		}
		key = key.trim();
		/** @type {{parentNode: TranscludeToken, firstChild: AtomToken}} */
		const {parentNode, firstChild} = this;
		if (this.name === key) {
			Parser.warn('未改变实际参数名', key);
		} else if (parentNode?.hasArg(key)) {
			if (force) {
				Parser.warn('参数更名造成重复参数', key);
			} else {
				throw new RangeError(`参数更名造成重复参数：${key}`);
			}
		}
		firstChild.safeReplaceWith(key);
	}
}

Parser.classes.ParameterToken = __filename;
module.exports = ParameterToken;
