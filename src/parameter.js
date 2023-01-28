'use strict';

const {noWrap, extUrlChar} = require('../util/string'),
	{generateForChild} = require('../util/lint'),
	fixedToken = require('../mixin/fixedToken'),
	Parser = require('..'),
	Token = require('.');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
class ParameterToken extends fixedToken(Token) {
	type = 'parameter';

	/** 是否是匿名参数 */
	get anon() {
		return this.firstChild.length === 0;
	}

	/** getValue()的getter */
	get value() {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/**
	 * 是否是重复参数
	 * @this {ParameterToken & {parentNode: TranscludeToken}}
	 */
	get duplicated() {
		const TranscludeToken = require('./transclude');
		try {
			return Boolean(this.parentNode?.getDuplicatedArgs()?.some(([key]) => key === this.name));
		} catch {
			return false;
		}
	}

	/**
	 * @param {string|number} key 参数名
	 * @param {string} value 参数值
	 * @param {accum} accum
	 */
	constructor(key, value, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, true, accum, {
				'Stage-11': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, true, accum);
		keyToken.type = 'parameter-key';
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @override */
	afterBuild() {
		if (!this.anon) {
			const TranscludeToken = require('./transclude');
			const name = this.firstChild.toString('comment, noinclude, include').trim(),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode instanceof TranscludeToken) {
				parentNode.getAttribute('keys').add(name);
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		const /** @type {AstListener} */ parameterListener = ({prevTarget}, data) => {
			if (!this.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstChild, name} = this;
				if (prevTarget === firstChild) {
					const newKey = firstChild.toString('comment, noinclude, include').trim();
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
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		return this.anon && !(selector && this.matches(selector))
			? this.lastChild.toString(selector)
			: super.toString(selector, '=');
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return this.anon ? this.lastChild.text() : super.text('=');
	}

	/** @override */
	getGaps() {
		return this.anon ? 0 : 1;
	}

	/** @override */
	print() {
		return super.print({sep: this.anon ? '' : '='});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			{firstChild, lastChild} = this,
			link = new RegExp(`https?://${extUrlChar}$`, 'iu')
				.exec(firstChild.toString('comment, noinclude, include'))?.[0];
		if (link && new URL(link).search) {
			const e = generateForChild(firstChild, {token: this, start}, '匿名参数中未转义的查询参数');
			errors.push({
				...e,
				startIndex: e.endIndex,
				endIndex: e.endIndex + 1,
				startLine: e.endLine,
				startCol: e.endCol,
				endCol: e.endCol + 1,
				excerpt: `${String(firstChild).slice(-25)}=${String(lastChild).slice(0, 25)}`,
			});
		}
		return errors;
	}

	/**
	 * 获取参数值
	 * @this {ParameterToken & {parentNode: TranscludeToken}}
	 */
	getValue() {
		const TranscludeToken = require('./transclude');
		const value = this.lastChild.text();
		return this.anon && this.parentNode?.isTemplate() ? value : value.trim();
	}

	/** @override */
	cloneNode() {
		const [key, value] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			return token.afterBuild();
		});
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

	/**
	 * 设置参数值
	 * @this {ParameterToken & {parentNode: TranscludeToken}}
	 * @param {string} value 参数值
	 * @throws `SyntaxError` 非法的模板参数
	 */
	setValue(value) {
		value = String(value);
		const TranscludeToken = require('./transclude');
		const templateLike = this.parentNode?.isTemplate(),
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${this.anon ? '' : '1='}${value}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: transclude} = root,
			/** @type {Token & {lastChild: ParameterToken}} */
			{lastChild: parameter, type, name, length: transcludeLength} = transclude,
			targetType = templateLike ? 'template' : 'magic-word',
			targetName = templateLike ? 'T' : 'lc';
		if (length !== 1 || type !== targetType || name !== targetName || transcludeLength !== 2
			|| parameter.anon !== this.anon || parameter.name !== '1'
		) {
			throw new SyntaxError(`非法的模板参数：${noWrap(value)}`);
		}
		const {lastChild} = parameter;
		parameter.destroy(true);
		this.lastChild.safeReplaceWith(lastChild);
	}

	/**
	 * 修改参数名
	 * @this {ParameterToken & {parentNode: TranscludeToken}}
	 * @param {string} key 新参数名
	 * @param {boolean} force 是否无视冲突命名
	 * @throws `Error` 仅用于模板参数
	 * @throws `SyntaxError` 非法的模板参数名
	 * @throws `RangeError` 更名造成重复参数
	 */
	rename(key, force) {
		key = String(key);
		const TranscludeToken = require('./transclude');
		const {parentNode} = this;
		// 必须检测是否是TranscludeToken
		if (!parentNode?.isTemplate() || !(parentNode instanceof TranscludeToken)) {
			throw new Error(`${this.constructor.name}.rename 方法仅用于模板参数！`);
		}
		const root = Parser.parse(`{{:T|${key}=}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: template} = root,
			{type, name, lastChild: parameter, length: templateLength} = template;
		if (length !== 1 || type !== 'template' || name !== 'T' || templateLength !== 2) {
			throw new SyntaxError(`非法的模板参数名：${key}`);
		}
		const {name: parameterName, firstChild} = parameter;
		if (this.name === parameterName) {
			Parser.warn('未改变实际参数名', parameterName);
		} else if (parentNode.hasArg(parameterName)) {
			if (force) {
				Parser.warn('参数更名造成重复参数', parameterName);
			} else {
				throw new RangeError(`参数更名造成重复参数：${parameterName}`);
			}
		}
		parameter.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes.ParameterToken = __filename;
module.exports = ParameterToken;
