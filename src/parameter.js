'use strict';

const {noWrap} = require('../util/string'),
	fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [AtomToken, Token]}`
 */
class ParameterToken extends fixedToken(Token) {
	type = 'parameter';
	anon;

	/**
	 * @param {string|number} key 参数名
	 * @param {string} value 参数值
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.anon = typeof key === 'number';
		const AtomToken = require('./atom');
		const keyToken = new AtomToken(this.anon ? undefined : key, 'parameter-key', config, accum, {
				'Stage-2': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @override */
	cloneNode() {
		const [key, value] = this.cloneChildren(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config);
			token.firstElementChild.safeReplaceWith(key);
			token.lastElementChild.safeReplaceWith(value);
			return token.afterBuild();
		});
	}

	/** @override */
	afterBuild() {
		if (!this.anon) {
			const name = this.firstElementChild.text().trim(),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode && parentNode instanceof require('./transclude')) {
				parentNode.getAttribute('keys').add(name);
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		const /** @type {AstListener} */ parameterListener = ({prevTarget}, data) => {
			if (!this.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstElementChild, name} = this;
				if (prevTarget === firstElementChild) {
					const newKey = firstElementChild.text().trim();
					data.oldKey = name;
					data.newKey = newKey;
					this.setAttribute('name', newKey);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
		return this;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	/** @override */
	getGaps() {
		return this.anon ? 0 : 1;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return this.anon ? this.lastElementChild.text() : super.text('=');
	}

	/**
	 * @override
	 * @param {ParameterToken} token 待替换的节点
	 * @complexity `n`
	 */
	safeReplaceWith(token) {
		Parser.warn(`${this.constructor.name}.safeReplaceWith 方法退化到 replaceWith。`);
		return this.replaceWith(token);
	}

	/** 获取参数值 */
	getValue() {
		const value = this.lastElementChild.text();
		return this.anon && this.parentNode?.matches('template, magic-word#invoke') ? value : value.trim();
	}

	/**
	 * 设置参数值
	 * @param {string} value 参数值
	 * @throws `SyntaxError` 非法的模板参数
	 */
	setValue(value) {
		value = String(value);
		const templateLike = this.parentNode?.matches('template, magic-word#invoke'),
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${this.anon ? '' : '1='}${value}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root,
			/** @type {ParameterToken} */ lastElementChild = firstElementChild?.lastElementChild;
		if (length !== 1 || !firstElementChild?.matches(templateLike ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childNodes.length !== 2
			|| lastElementChild.anon !== this.anon || lastElementChild.name !== '1'
		) {
			throw new SyntaxError(`非法的模板参数：${noWrap(value)}`);
		}
		const {lastChild} = lastElementChild;
		root.destroy();
		firstElementChild.destroy();
		lastElementChild.destroy();
		this.lastElementChild.safeReplaceWith(lastChild);
	}

	/**
	 * 修改参数名
	 * @param {string} key 新参数名
	 * @param {boolean} force 是否无视冲突命名
	 * @throws `Error` 仅用于模板参数
	 * @throws `SyntaxError` 非法的模板参数名
	 * @throws `RangeError` 更名造成重复参数
	 */
	rename(key, force = false) {
		if (typeof key !== 'string') {
			this.typeError('rename', 'String');
		}
		const {parentNode} = this;
		// 必须检测是否是TranscludeToken
		if (!parentNode || !parentNode.matches('template, magic-word#invoke')
			|| !(parentNode instanceof require('./transclude'))
		) {
			throw new Error(`${this.constructor.name}.rename 方法仅用于模板参数！`);
		}
		const root = Parser.parse(`{{:T|${key}=}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('template#T') || firstElementChild.childNodes.length !== 2) {
			throw new SyntaxError(`非法的模板参数名：${key}`);
		}
		const {lastElementChild} = firstElementChild,
			{name, firstChild} = lastElementChild;
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
		this.firstElementChild.safeReplaceWith(firstChild);
	}
}

Parser.classes.ParameterToken = __filename;
module.exports = ParameterToken;
