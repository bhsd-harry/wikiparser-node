'use strict';

const {removeComment, escapeRegExp, text, noWrap, print} = require('../util/string'),
	{externalUse} = require('../util/debug'),
	{generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	ParameterToken = require('./parameter'),
	AtomToken = require('./atom'),
	SyntaxToken = require('./syntax');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
class TranscludeToken extends Token {
	type = 'template';
	modifier = '';
	/** @type {Record<string, Set<ParameterToken>>} */ #args = {};
	/** @type {Set<string>} */ #keys = new Set();

	/** 是否存在重复参数 */
	get duplication() {
		return this.isTemplate() && Boolean(this.hasDuplicatedArgs());
	}

	/**
	 * 设置引用修饰符
	 * @param {string} modifier 引用修饰符
	 * @complexity `n`
	 */
	setModifier(modifier = '') {
		if (typeof modifier !== 'string') {
			this.typeError('setModifier', 'String');
		}
		const {parserFunction: [,, raw, subst]} = this.getAttribute('config'),
			lcModifier = modifier.trimStart().toLowerCase(),
			isRaw = raw.includes(lcModifier),
			isSubst = subst.includes(lcModifier),
			wasRaw = raw.includes(this.modifier.trimStart().toLowerCase());
		if (wasRaw && isRaw || !wasRaw && (isSubst || modifier === '')
			|| (Parser.running || this.length > 1) && (isRaw || isSubst || modifier === '')
		) {
			this.setAttribute('modifier', modifier);
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * @param {string} title 模板标题或魔术字
	 * @param {[string, string|undefined][]} parts 参数各部分
	 * @param {accum} accum
	 * @complexity `n`
	 * @throws `SyntaxError` 非法的模板名称
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			AtomToken: 0, SyntaxToken: 0, ParameterToken: '1:',
		});
		const {parserFunction: [insensitive, sensitive, raw]} = config;
		this.seal('modifier');
		if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':');
			if (this.setModifier(modifier)) {
				title = arg.join(':');
			}
		}
		if (title.includes(':') || parts.length === 0 && !raw.includes(this.modifier.toLowerCase())) {
			const [magicWord, ...arg] = title.split(':'),
				cleaned = removeComment(magicWord),
				name = cleaned[arg.length > 0 ? 'trimStart' : 'trim'](),
				isSensitive = sensitive.includes(name),
				canonicalCame = insensitive[name.toLowerCase()];
			if (isSensitive || canonicalCame) {
				this.setAttribute('name', canonicalCame || name.toLowerCase()).type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? 'u' : 'iu'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
						'Stage-1': ':', '!ExtToken': '',
					});
				this.insertAt(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					this.setAttribute('acceptable', {SyntaxToken: 0, AtomToken: '1:3', ParameterToken: '3:'});
					for (let i = 0; i < 2; i++) {
						const part = parts.shift();
						if (!part) {
							break;
						}
						const invoke = new AtomToken(part.join('='), `invoke-${
							i ? 'function' : 'module'
						}`, config, accum, {
							'Stage-1': ':', '!ExtToken': '',
						});
						this.insertAt(invoke);
					}
					this.getAttribute('protectChildren')('1:3');
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title).split('#')[0].trim();
			if (/\0\d+[eh!+-]\x7F|[<>[\]{}\n]/u.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${noWrap(name)}`);
			}
			const token = new AtomToken(title, 'template-name', config, accum, {
				'Stage-2': ':', '!HeadingToken': '',
			});
			this.insertAt(token);
		}
		const templateLike = this.isTemplate();
		let i = 1;
		for (const part of parts) {
			if (!templateLike) {
				part[0] = part.join('=');
				part.length = 1;
			}
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			this.insertAt(new ParameterToken(...part, config, accum));
		}
		this.getAttribute('protectChildren')(0);
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		if (selector && this.matches(selector)) {
			return '';
		}
		const {childNodes, firstChild, modifier} = this;
		return `{{${modifier}${modifier && ':'}${
			this.type === 'magic-word'
				? `${String(firstChild)}${childNodes.length > 1 ? ':' : ''}${childNodes.slice(1).map(String).join('|')}`
				: super.toString(selector, '|')
		}}}`;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		const {childNodes, firstChild, modifier} = this;
		return `{{${modifier}${modifier && ':'}${
			this.type === 'magic-word'
				? `${firstChild.text()}${childNodes.length > 1 ? ':' : ''}${text(childNodes.slice(1), '|')}`
				: super.text('|')
		}}}`;
	}

	/** @override */
	getPadding() {
		return this.modifier ? this.modifier.length + 3 : 2;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		const {childNodes, firstChild, modifier} = this;
		return `<span class="wpb-${this.type}">{{${modifier}${modifier && ':'}${
			this.type === 'magic-word'
				? `${firstChild.print()}${childNodes.length > 1 ? ':' : ''}${print(childNodes.slice(1), {sep: '|'})}`
				: print(childNodes, {sep: '|'})
		}}}</span>`;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (!this.isTemplate()) {
			return errors;
		}
		const duplicatedArgs = this.getDuplicatedArgs();
		if (duplicatedArgs.length > 0) {
			const rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...duplicatedArgs.flatMap(([, args]) => args).map(
				arg => generateForChild(arg, rect, '重复参数'),
			));
		}
		return errors;
	}

	/** 是否是模板 */
	isTemplate() {
		return this.type === 'template' || this.type === 'magic-word' && this.name === 'invoke';
	}

	/**
	 * 处理匿名参数更改
	 * @param {number|ParameterToken} addedToken 新增的参数
	 * @complexity `n`
	 */
	#handleAnonArgChange(addedToken) {
		const args = this.getAnonArgs(),
			added = typeof addedToken !== 'number',
			maxAnon = String(args.length + (added ? 0 : 1));
		if (added) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon, true)) {
			this.#keys.delete(maxAnon);
		}
		const j = added ? args.indexOf(addedToken) : addedToken - 1;
		for (let i = j; i < args.length; i++) {
			const token = args[i],
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				this.getArgs(newName, false, false).add(token.setAttribute('name', newName));
				if (name) {
					this.getArgs(name, false, false).delete(token);
				}
			}
		}
	}

	/**
	 * @override
	 * @param {ParameterToken} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(token, i = this.length) {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);
			this.#keys.add(token.name);
		}
		return token;
	}

	/**
	 * 获取所有参数
	 * @returns {ParameterToken[]}
	 * @complexity `n`
	 */
	getAllArgs() {
		return this.childNodes.filter(child => child instanceof ParameterToken);
	}

	/**
	 * 获取匿名参数
	 * @complexity `n`
	 */
	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * 获取指定参数
	 * @param {string|number} key 参数名
	 * @param {boolean} exact 是否匹配匿名性
	 * @param {boolean} copy 是否返回一个备份
	 * @complexity `n`
	 */
	getArgs(key, exact, copy = true) {
		if (typeof key !== 'string' && typeof key !== 'number') {
			this.typeError('getArgs', 'String', 'Number');
		}
		copy ||= !Parser.debugging && externalUse('getArgs');
		const keyStr = String(key).trim();
		let args;
		if (Object.hasOwn(this.#args, keyStr)) {
			args = this.#args[keyStr];
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args[keyStr] = args;
		}
		if (exact && !isNaN(keyStr)) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}
		return args;
	}

	/**
	 * 获取重名参数
	 * @complexity `n`
	 * @returns {[string, ParameterToken[]][]}
	 * @throws `Error` 仅用于模板
	 */
	getDuplicatedArgs() {
		if (this.isTemplate()) {
			return Object.entries(this.#args).filter(([, {size}]) => size > 1)
				.map(([key, args]) => [key, [...args]]);
		}
		throw new Error(`${this.constructor.name}.getDuplicatedArgs 方法仅供模板使用！`);
	}

	/**
	 * 对特定魔术字获取可能的取值
	 * @this {ParameterToken}}
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues() {
		const {type, name, childNodes, constructor: {name: cName}} = this;
		if (type === 'template') {
			throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		let start;
		switch (name) {
			case 'if':
			case 'ifexist':
			case 'ifexpr':
			case 'iferror':
				start = 2;
				break;
			case 'ifeq':
				start = 3;
				break;
			default:
				throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		const /** @type {Token[]} */ queue = childNodes.slice(start, start + 2).map(({childNodes: [, value]}) => value);
		for (let i = 0; i < queue.length;) {
			/** @type {Token[] & {0: TranscludeToken}} */
			const {length, 0: first} = queue[i].childNodes.filter(child => child.text().trim());
			if (length === 0) {
				queue.splice(i, 1);
			} else if (length > 1 || first.type !== 'magic-word') {
				i++;
			} else {
				try {
					const possibleValues = first.getPossibleValues();
					queue.splice(i, 1, ...possibleValues);
					i += possibleValues.length;
				} catch {
					i++;
				}
			}
		}
		return queue;
	}

	/** @override */
	cloneNode() {
		const [first, ...cloned] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new TranscludeToken(this.type === 'template' ? '' : first.text(), [], config);
			token.setModifier(this.modifier);
			token.firstChild.safeReplaceWith(first);
			token.afterBuild();
			token.append(...cloned);
			return token;
		});
	}

	/** @override */
	afterBuild() {
		if (this.type === 'template') {
			this.setAttribute('name', this.normalizeTitle(this.firstChild.text(), 10).title);
		}
		if (this.isTemplate()) {
			/**
			 * 当事件bubble到`parameter`时，将`oldKey`和`newKey`保存进AstEventData。
			 * 当继续bubble到`template`时，处理并删除`oldKey`和`newKey`。
			 * @type {AstListener}
			 */
			const transcludeListener = (e, data) => {
				const {prevTarget} = e,
					{oldKey, newKey} = data ?? {};
				if (typeof oldKey === 'string') {
					delete data.oldKey;
					delete data.newKey;
				}
				if (prevTarget === this.firstChild && this.type === 'template') {
					this.setAttribute('name', this.normalizeTitle(prevTarget.text(), 10).title);
				} else if (oldKey !== newKey && prevTarget instanceof ParameterToken) {
					const oldArgs = this.getArgs(oldKey, false, false);
					oldArgs.delete(prevTarget);
					this.getArgs(newKey, false, false).add(prevTarget);
					this.#keys.add(newKey);
					if (oldArgs.size === 0) {
						this.#keys.delete(oldKey);
					}
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], transcludeListener);
		}
	}

	/** 替换引用 */
	subst() {
		this.setModifier('subst');
	}

	/** 安全的替换引用 */
	safesubst() {
		this.setModifier('safesubst');
	}

	/**
	 * @override
	 * @param {PropertyKey} key 属性键
	 */
	hasAttribute(key) {
		return key === 'keys' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'args') {
			return {...this.#args};
		} else if (key === 'keys') {
			return !Parser.debugging && externalUse('getAttribute') ? new Set(this.#keys) : this.#keys;
		}
		return super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @complexity `n`
	 */
	removeAt(i) {
		const /** @type {ParameterToken} */ token = super.removeAt(i);
		if (token.anon) {
			this.#handleAnonArgChange(Number(token.name));
		} else {
			const args = this.getArgs(token.name, false, false);
			args.delete(token);
			if (args.size === 0) {
				this.#keys.delete(token.name);
			}
		}
		return token;
	}

	/**
	 * 是否具有某参数
	 * @param {string|number} key 参数名
	 * @param {boolean} exact 是否匹配匿名性
	 * @complexity `n`
	 */
	hasArg(key, exact) {
		return this.getArgs(key, exact, false).size > 0;
	}

	/**
	 * 获取生效的指定参数
	 * @param {string|number} key 参数名
	 * @param {boolean} exact 是否匹配匿名性
	 * @complexity `n`
	 */
	getArg(key, exact) {
		return [...this.getArgs(key, exact, false)].sort((a, b) => a.compareDocumentPosition(b)).at(-1);
	}

	/**
	 * 移除指定参数
	 * @param {string|number} key 参数名
	 * @param {boolean} exact 是否匹配匿名性
	 * @complexity `n`
	 */
	removeArg(key, exact) {
		Parser.run(() => {
			for (const token of this.getArgs(key, exact, false)) {
				this.removeChild(token);
			}
		});
	}

	/**
	 * 获取所有参数名
	 * @complexity `n`
	 */
	getKeys() {
		const args = this.getAllArgs();
		if (this.#keys.size === 0 && args.length > 0) {
			for (const {name} of args) {
				this.#keys.add(name);
			}
		}
		return [...this.#keys];
	}

	/**
	 * 获取参数值
	 * @param {string|number} key 参数名
	 * @complexity `n`
	 */
	getValues(key) {
		return [...this.getArgs(key, false, false)].map(token => token.getValue());
	}

	/**
	 * 获取生效的参数值
	 * @template {string|number|undefined} T
	 * @param {T} key 参数名
	 * @returns {T extends undefined ? Record<string, string> : string}
	 * @complexity `n`
	 */
	getValue(key) {
		return key === undefined
			? Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)]))
			: this.getArg(key)?.getValue();
	}

	/**
	 * 插入匿名参数
	 * @param {string} val 参数值
	 * @returns {ParameterToken}
	 * @complexity `n`
	 * @throws `SyntaxError` 非法的匿名参数
	 */
	newAnonArg(val) {
		val = String(val);
		const templateLike = this.isTemplate(),
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${val}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: transclude} = root,
			/** @type {Token & {lastChild: ParameterToken}} */
			{type, name, length: transcludeLength, lastChild} = transclude,
			targetType = templateLike ? 'template' : 'magic-word',
			targetName = templateLike ? 'T' : 'lc';
		if (length === 1 && type === targetType && name === targetName && transcludeLength === 2 && lastChild.anon) {
			return this.insertAt(lastChild);
		}
		throw new SyntaxError(`非法的匿名参数：${noWrap(val)}`);
	}

	/**
	 * 设置参数值
	 * @param {string} key 参数名
	 * @param {string} value 参数值
	 * @complexity `n`
	 * @throws `Error` 仅用于模板
	 * @throws `SyntaxError` 非法的命名参数
	 */
	setValue(key, value) {
		if (typeof key !== 'string') {
			this.typeError('setValue', 'String');
		} else if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.setValue 方法仅供模板使用！`);
		}
		const token = this.getArg(key);
		value = String(value);
		if (token) {
			token.setValue(value);
			return;
		}
		const wikitext = `{{:T|${key}=${value}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: template} = root,
			{type, name, length: templateLength, lastChild: parameter} = template;
		if (length !== 1 || type !== 'template' || name !== 'T' || templateLength !== 2 || parameter.name !== key) {
			throw new SyntaxError(`非法的命名参数：${key}=${noWrap(value)}`);
		}
		this.insertAt(parameter);
	}

	/**
	 * 将匿名参数改写为命名参数
	 * @complexity `n`
	 * @throws `Error` 仅用于模板
	 */
	anonToNamed() {
		if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.anonToNamed 方法仅供模板使用！`);
		}
		for (const token of this.getAnonArgs()) {
			token.firstChild.replaceChildren(token.name);
		}
	}

	/**
	 * 替换模板名
	 * @param {string} title 模板名
	 * @throws `Error` 仅用于模板
	 * @throws `SyntaxError` 非法的模板名称
	 */
	replaceTemplate(title) {
		if (this.type === 'magic-word') {
			throw new Error(`${this.constructor.name}.replaceTemplate 方法仅用于更换模板！`);
		} else if (typeof title !== 'string') {
			this.typeError('replaceTemplate', 'String');
		}
		const root = Parser.parse(`{{${title}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: template} = root;
		if (length !== 1 || template.type !== 'template' || template.length !== 1) {
			throw new SyntaxError(`非法的模板名称：${title}`);
		}
		this.firstChild.replaceChildren(...template.firstChild.childNodes);
	}

	/**
	 * 替换模块名
	 * @param {string} title 模块名
	 * @throws `Error` 仅用于模块
	 * @throws `SyntaxError` 非法的模块名称
	 */
	replaceModule(title) {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (typeof title !== 'string') {
			this.typeError('replaceModule', 'String');
		}
		const root = Parser.parse(`{{#invoke:${title}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: invoke} = root,
			{type, name, length: invokeLength, lastChild} = invoke;
		if (length !== 1 || type !== 'magic-word' || name !== 'invoke' || invokeLength !== 2) {
			throw new SyntaxError(`非法的模块名称：${title}`);
		} else if (this.length > 1) {
			this.childNodes[1].replaceChildren(...lastChild.childNodes);
		} else {
			invoke.destroy(true);
			this.insertAt(lastChild);
		}
	}

	/**
	 * 替换模块函数
	 * @param {string} func 模块函数名
	 * @throws `Error` 仅用于模块
	 * @throws `Error` 尚未指定模块名称
	 * @throws `SyntaxError` 非法的模块函数名
	 */
	replaceFunction(func) {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (typeof func !== 'string') {
			this.typeError('replaceFunction', 'String');
		} else if (this.length < 2) {
			throw new Error('尚未指定模块名称！');
		}
		const root = Parser.parse(
				`{{#invoke:M|${func}}}`, this.getAttribute('include'), 2, this.getAttribute('config'),
			),
			{length, firstChild: invoke} = root,
			{type, name, length: invokeLength, lastChild} = invoke;
		if (length !== 1 || type !== 'magic-word' || name !== 'invoke' || invokeLength !== 3) {
			throw new SyntaxError(`非法的模块函数名：${func}`);
		} else if (this.length > 2) {
			this.childNodes[2].replaceChildren(...lastChild.childNodes);
		} else {
			invoke.destroy(true);
			this.insertAt(lastChild);
		}
	}

	/**
	 * 是否存在重名参数
	 * @complexity `n`
	 * @throws `Error` 仅用于模板
	 */
	hasDuplicatedArgs() {
		if (this.isTemplate()) {
			return this.getAllArgs().length - this.getKeys().length;
		}
		throw new Error(`${this.constructor.name}.hasDuplicatedArgs 方法仅供模板使用！`);
	}

	/**
	 * 修复重名参数：
	 * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * `aggressive = true`时还会尝试处理连续的以数字编号的参数。
	 * @param {boolean} aggressive 是否使用有更大风险的修复手段
	 * @complexity `n²`
	 */
	fixDuplication(aggressive) {
		if (!this.hasDuplicatedArgs()) {
			return [];
		}
		const /** @type {string[]} */ duplicatedKeys = [];
		let {length: anonCount} = this.getAnonArgs();
		for (const [key, args] of this.getDuplicatedArgs()) {
			if (args.length <= 1) {
				continue;
			}
			const /** @type {Record<string, ParameterToken[]>} */ values = {};
			for (const arg of args) {
				const val = arg.getValue().trim();
				if (Object.hasOwn(values, val)) {
					values[val].push(arg);
				} else {
					values[val] = [arg];
				}
			}
			let noMoreAnon = anonCount === 0 || isNaN(key);
			const emptyArgs = values[''] ?? [],
				duplicatedArgs = Object.entries(values).filter(([val, {length}]) => val && length > 1)
					.flatMap(([, curArgs]) => {
						const anonIndex = noMoreAnon ? -1 : curArgs.findIndex(({anon}) => anon);
						if (anonIndex !== -1) {
							noMoreAnon = true;
						}
						curArgs.splice(anonIndex, 1);
						return curArgs;
					}),
				badArgs = [...emptyArgs, ...duplicatedArgs],
				index = noMoreAnon ? -1 : emptyArgs.findIndex(({anon}) => anon);
			if (badArgs.length === args.length) {
				badArgs.splice(index, 1);
			} else if (index !== -1) {
				this.anonToNamed();
				anonCount = 0;
			}
			for (const arg of badArgs) {
				arg.remove();
			}
			let remaining = args.length - badArgs.length;
			if (remaining === 1) {
				continue;
			} else if (aggressive && (anonCount ? /\D\d+$/u : /(?:^|\D)\d+$/u).test(key)) {
				let /** @type {number} */ last;
				const str = key.slice(0, -/(?<!\d)\d+$/u.exec(key)[0].length),
					regex = new RegExp(`^${escapeRegExp(str)}\\d+$`, 'u'),
					series = this.getAllArgs().filter(({name}) => regex.test(name)),
					ordered = series.every(({name}, i) => {
						const j = Number(name.slice(str.length)),
							cmp = j <= i + 1 && (i === 0 || j >= last || name === key);
						last = j;
						return cmp;
					});
				if (ordered) {
					for (let i = 0; i < series.length; i++) {
						const name = `${str}${i + 1}`,
							arg = series[i];
						if (arg.name !== name) {
							if (arg.name === key) {
								remaining--;
							}
							arg.rename(name, true);
						}
					}
				}
			}
			if (remaining > 1) {
				Parser.error(`${this.type === 'template'
					? this.name
					: this.normalizeTitle(this.childNodes[1]?.text() ?? '', 828).title
				} 还留有 ${remaining} 个重复的 ${key} 参数：${[...this.getArgs(key)].map(arg => {
					const {top, left} = arg.getBoundingClientRect();
					return `第 ${top} 行第 ${left} 列`;
				}).join('、')}`);
				duplicatedKeys.push(key);
				continue;
			}
		}
		return duplicatedKeys;
	}

	/**
	 * 转义模板内的表格
	 * @returns {TranscludeToken}
	 * @complexity `n`
	 * @throws `Error` 转义失败
	 */
	escapeTables() {
		const count = this.hasDuplicatedArgs();
		if (!/\n[^\S\n]*(?::+\s*)?\{\|[^\n]*\n\s*(?:\S[^\n]*\n\s*)*\|\}/u.test(this.text()) || !count) {
			return this;
		}
		const stripped = String(this).slice(2, -2),
			include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			parsed = Parser.parse(stripped, include, 4, config);
		const TableToken = require('./table');
		for (const table of parsed.childNodes) {
			if (table instanceof TableToken) {
				table.escape();
			}
		}
		const {firstChild, childNodes} = Parser.parse(`{{${String(parsed)}}}`, include, 2, config);
		if (childNodes.length !== 1 || !(firstChild instanceof TranscludeToken)) {
			throw new Error('转义表格失败！');
		}
		const newCount = firstChild.hasDuplicatedArgs();
		if (newCount === count) {
			return this;
		}
		Parser.info(`共修复了 ${count - newCount} 个重复参数。`);
		this.safeReplaceWith(firstChild);
		return firstChild;
	}
}

Parser.classes.TranscludeToken = __filename;
module.exports = TranscludeToken;
