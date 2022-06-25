'use strict';

const {typeError} = require('../util/debug'),
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
	 * @param {string|number} key
	 * @param {string} value
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.anon = typeof key === 'number';
		const AtomToken = require('./atom'),
			keyToken = new AtomToken(this.anon ? undefined : key, 'parameter-key', config, accum, {
				'Stage-2': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, true, accum);
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	cloneNode() {
		const [key, value] = this.cloneChildren();
		Parser.running = true;
		const config = this.getAttribute('config'),
			token = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config);
		token.firstElementChild.safeReplaceWith(key);
		token.lastElementChild.safeReplaceWith(value);
		token.afterBuild();
		Parser.running = false;
		return token;
	}

	afterBuild() {
		super.afterBuild();
		if (!this.anon) {
			const name = this.firstElementChild.text().trim(),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode && parentNode instanceof require('./transclude')) {
				parentNode.getAttribute('keys').add(name);
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		const that = this;
		/**
		 * 在AstEventData中记录`oldKey`和`newKey`
		 * @type {AstListener}
		 */
		const parameterListener = ({prevTarget}, data) => {
			if (!that.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstElementChild} = that;
				if (prevTarget === firstElementChild) {
					const newKey = firstElementChild.text().trim();
					data.oldKey = that.name;
					data.newKey = newKey;
					that.setAttribute('name', newKey);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
		return this;
	}

	/** @returns {string} */
	toString() {
		return this.anon ? this.lastElementChild.toString() : super.toString('=');
	}

	getGaps() {
		return this.anon ? 0 : 1;
	}

	/** @returns {string} */
	text() {
		return this.anon ? this.lastElementChild.text() : super.text('=');
	}

	/** @returns {[number, string][]} */
	plain() {
		return this.lastElementChild.plain();
	}

	/** @param {ParameterToken} token */
	safeReplaceWith(token) {
		Parser.warn(`${this.constructor.name}.safeReplaceWith 方法退化到 replaceWith。`);
		return this.replaceWith(token);
	}

	getValue() {
		const value = this.lastElementChild.text();
		return this.anon && this.parentNode?.matches('template, magic-word#invoke') ? value : value.trim();
	}

	/** @param {string} value */
	setValue(value) {
		value = String(value);
		const templateLike = this.parentElement?.matches('template, magic-word#invoke'),
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${this.anon ? '' : '1='}${value}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root,
			/** @type {ParameterToken} */ lastElementChild = firstElementChild?.lastElementChild;
		if (length !== 1 || !firstElementChild?.matches(templateLike ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2
			|| lastElementChild.anon !== this.anon || lastElementChild.name !== '1'
		) {
			throw new SyntaxError(`非法的模板参数：${value.replaceAll('\n', '\\n')}`);
		}
		const newValue = lastElementChild.lastChild;
		root.destroy();
		firstElementChild.destroy();
		lastElementChild.destroy();
		this.lastElementChild.safeReplaceWith(newValue);
	}

	/** @param {string} key */
	rename(key, force = false) {
		if (typeof key !== 'string') {
			typeError(this, 'rename', 'String');
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
		this.firstElementChild.safeReplaceWith(keyToken);
	}
}

Parser.classes.ParameterToken = __filename;
module.exports = ParameterToken;
