'use strict';

const {removeComment} = require('../util/string'),
	{typeError, externalUse, debugOnly} = require('../util/debug'),
	watchFirstChild = require('../mixin/watchFirstChild'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	ParameterToken = require('./parameterToken');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken, ...ParameterToken]}`
 */
class TranscludeToken extends watchFirstChild(Token) {
	type = 'template';
	modifier = '';
	/** @type {Set<string>} */ #keys = new Set();
	/** @type {Map<string, Set<ParameterToken>>} */ #args = new Map();

	/**
	 * @param {string} title
	 * @param {[string, string|undefined][]} parts
	 * @param {accum} accum
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, ParameterToken: '1:'});
		const AtomToken = require('./atomToken'),
			{parserFunction: [insensitive, sensitive, raw]} = config;
		this.seal('modifier');
		if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':');
			if (this.setModifier(modifier)) {
				title = arg.join(':');
			}
		}
		if (title.includes(':') || parts.length === 0 && !raw.includes(this.modifier)) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord);
			if (sensitive.includes(name) || insensitive.includes(name.toLowerCase())) {
				this.setAttribute('name', name.toLowerCase().replace(/^#/, '')).type = 'magic-word';
				const token = new AtomToken(magicWord, 'magic-word-name', accum, {'Stage-1': ':', '!ExtToken': ''});
				this.appendChild(token);
				if (arg.length) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					for (let i = 0; i < 2; i++) {
						const part = parts.shift();
						if (!part) {
							break;
						}
						const invoke = new AtomToken(part.join('='), `invoke-${i ? 'func' : 'module'}`, accum, {
							'Stage-1': ':', '!ExtToken': '',
						});
						this.appendChild(invoke);
					}
					this.protectChildren('1:3');
				}
			}
		}
		if (this.type === 'template') {
			const [name] = removeComment(title).split('#');
			if (/\x00\d+e\x7f|[<>[\]{}]/.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			const token = new AtomToken(title, 'template-name', accum, {'Stage-2': ':', '!HeadingToken': ''});
			this.appendChild(token);
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
			this.appendChild(new ParameterToken(...part, config, accum));
		}
		this.protectChildren(0);
		if (!templateLike) {
			return;
		}
		const that = this;
		/**
		 * 当事件bubble到`parameter`时，将`oldKey`和`newKey`保存进AstEventData。
		 * 当继续bubble到`template`时，处理并删除`oldKey`和`newKey`。
		 * @type {AstListener}
		 */
		const transcludeListener = ({prevTarget}, data) => {
			const {oldKey, newKey} = data ?? {};
			if (typeof oldKey === 'string') {
				delete data.oldKey;
				delete data.newKey;
			}
			if (prevTarget instanceof ParameterToken && oldKey !== newKey) {
				const oldArgs = that.getArgs(oldKey, false);
				oldArgs.delete(prevTarget);
				that.getArgs(newKey, false).add(prevTarget);
				that.#keys.add(newKey);
				if (oldArgs.size === 0) {
					that.#keys.delete(oldKey);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], transcludeListener);
	}

	/** @param {string} modifier */
	setModifier(modifier, force = false) {
		if (!modifier || force && !externalUse('setModifier') || new RegExp(`^\\s*(?:${
			this.getAttribute('config').parserFunction.slice(2).flat().join('|')
		})\\s*$`, 'i').test(removeComment(modifier))) {
			const enumerable = Boolean(modifier);
			Object.defineProperty(this, 'modifier', {value: modifier || '', enumerable});
			return enumerable;
		}
		return false;
	}

	subst() {
		this.setModifier('subst');
	}

	safesubst() {
		this.setModifier('safesubst');
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (!Parser.debugging && ['args', 'keys'].includes(key) && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'args') {
			return this.#args;
		} else if (key === 'keys') {
			return this.#keys;
		}
		return super.getAttribute(key);
	}

	toString() {
		const {children, childElementCount, firstChild} = this;
		return `{{${this.modifier && `${this.modifier}:`}${
			this.type === 'magic-word'
				? `${String(firstChild)}${childElementCount > 1 ? ':' : ''}${children.slice(1).map(String).join('|')}`
				: super.toString('|')
		}}}`;
	}

	getPadding() {
		return this.modifier ? this.modifier.length + 3 : 2;
	}

	getGaps() {
		return 1;
	}

	text() {
		const {children, childElementCount, firstElementChild} = this;
		return this.type === 'magic-word'
			? `{{${firstElementChild.text()}${childElementCount > 1 ? ':' : ''}${
				children.slice(1).map(child => child.text()).join('|')
			}}}`
			: `{{${super.text('|')}}}`;
	}

	plain() {
		return this.getAllArgs().flatMap(child => child.plain());
	}

	/** @param {ParameterToken} addedToken */
	#handleAnonArgChange(addedToken) {
		const args = this.getAnonArgs(),
			maxAnon = String(args.length + (addedToken ? 0 : 1));
		if (addedToken) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon, true)) {
			this.#keys.delete(maxAnon);
		}
		const j = addedToken ? args.indexOf(addedToken) : 0;
		for (const [i, token] of [...args.entries()].slice(j)) {
			const {name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				this.getArgs(newName, false).add(token.setAttribute('name', newName));
				if (name) {
					this.getArgs(name, false).delete(token);
				}
			}
		}
	}

	/** @param {number} i */
	removeAt(i) {
		const /** @type {ParameterToken} */ token = super.removeAt(i);
		if (token.anon) {
			this.#handleAnonArgChange();
		} else {
			const args = this.getArgs(token.name, false);
			args.delete(token);
			if (args.size === 0) {
				this.#keys.delete(token.name);
			}
		}
		return token;
	}

	/** @param {ParameterToken} token */
	insertAt(token, i = this.childElementCount) {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false).add(token);
			this.#keys.add(token.name);
		}
		return token;
	}

	afterBuild() {
		if (this.type === 'template') {
			const name = this.firstElementChild.text().trim();
			this.setAttribute('name', this.normalizeTitle(name, 10));
		}
		if (this.modifier?.includes('\x00')) {
			this.setModifier(this.buildFromStr(this.modifier).map(String).join(''), true);
		}
		return super.afterBuild();
	}

	/** @returns {ParameterToken[]} */
	getAllArgs() {
		return this.children.filter(child => child instanceof ParameterToken);
	}

	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/** @param {string|number} key */
	getArgs(key, copy = true, exact = false) {
		if (!['string', 'number'].includes(typeof key)) {
			typeError('String', 'Number');
		} else if (!copy && !Parser.debugging && externalUse('getArgs')) {
			debugOnly(this.constructor, 'getArgs');
		}
		const keyStr = String(key).trim();
		let args = this.#args.get(keyStr);
		if (!args) {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args.set(keyStr, args);
		}
		if (copy && exact && !isNaN(keyStr)) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}
		return args;
	}

	/** @param {string|number} key */
	hasArg(key, exact = false) {
		return this.getArgs(key, exact, exact).size > 0;
	}

	/** @param {string|number} key */
	getArg(key, exact = false) {
		return [...this.getArgs(key, exact, exact)].sort((a, b) => a.comparePosition(b)).at(-1);
	}

	/** @param {string|number} key */
	removeArg(key, exact = false) {
		for (const token of this.getArgs(key, exact, exact)) {
			this.removeChild(token);
		}
	}

	getKeys() {
		const args = this.getAllArgs();
		if (this.#keys.size === 0 && args.length) {
			for (const {name} of args) {
				this.#keys.add(name);
			}
		}
		return [...this.#keys];
	}

	/** @param {string|number} key */
	getValues(key) {
		return [...this.getArgs(key, false)].map(token => token.getValue());
	}

	/**
	 * @template {string|number|undefined} T
	 * @param {T} key
	 * @returns {T extends undefined ? Object<string, string> : string}
	 */
	getValue(key) {
		if (key !== undefined) {
			return this.getArg(key)?.getValue();
		}
		return Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)]));
	}

	/** @param {string} val */
	newAnonArg(val) {
		val = String(val);
		const templateLike = this.isTemplate(),
			root = new Token(`{{${templateLike ? ':T|' : 'lc:'}${val}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches(templateLike ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2 || !firstElementChild.lastElementChild.anon
		) {
			throw new SyntaxError(`非法的匿名参数：${val.replaceAll('\n', '\\n')}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 */
	setValue(key, value) {
		if (typeof key !== 'string') {
			typeError('String');
		} else if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.setValue 方法仅供模板使用！`);
		}
		const token = this.getArg(key);
		value = String(value);
		if (token) {
			token.setValue(value);
			return;
		}
		const root = new Token(`{{:T|${key}=${value}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('template#T')
			|| firstElementChild.childElementCount !== 2 || firstElementChild.lastElementChild.name !== key
		) {
			throw new SyntaxError(`非法的命名参数：${key}=${value.replaceAll('\n', '\\n')}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}

	anonToNamed() {
		if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.anonToNamed 方法仅供模板使用！`);
		}
		for (const token of this.getAnonArgs()) {
			token.anon = false;
			token.firstElementChild.replaceChildren(token.name);
		}
	}

	/** @param {string} title */
	replaceTemplate(title) {
		if (this.type === 'magic-word') {
			throw new Error(`${this.constructor.name}.replaceTemplate 方法仅用于更换模板！`);
		} else if (typeof title !== 'string') {
			typeError('String');
		}
		const root = new Token(`{{${title}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'template' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的模板名称：${title}`);
		}
		this.setAttribute('name', firstElementChild.name)
			.firstElementChild.replaceChildren(...firstElementChild.firstElementChild.childNodes);
	}

	/** @param {string} title */
	replaceModule(title) {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (typeof title !== 'string') {
			typeError('String');
		}
		const root = new Token(`{{#invoke:${title}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('magic-word#invoke')
			|| firstElementChild.childElementCount !== 2
		) {
			throw new SyntaxError(`非法的模块名称：${title}`);
		} else if (this.childElementCount > 1) {
			this.children[1].replaceChildren(...firstElementChild.lastElementChild.childNodes);
		} else {
			const {lastChild} = firstElementChild;
			root.destroy();
			firstElementChild.destroy();
			this.appendChild(lastChild);
		}
	}

	/** @param {string} func */
	replaceFunction(func) {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (typeof func !== 'string') {
			typeError('String');
		} else if (this.childElementCount < 2) {
			throw new Error('尚未指定模块名称！');
		}
		const root = new Token(`{{#invoke:M|${func}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('magic-word#invoke')
			|| firstElementChild.childElementCount !== 3
		) {
			throw new SyntaxError(`非法的模块函数名：${func}`);
		} else if (this.childElementCount > 2) {
			this.children[2].replaceChildren(...firstElementChild.lastElementChild.childNodes);
		} else {
			const {lastChild} = firstElementChild;
			root.destroy();
			firstElementChild.destroy();
			this.appendChild(lastChild);
		}
	}

	getDuplicatedArgs() {
		if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.getDuplicatedArgs 方法仅供模板使用！`);
		}
		return [...this.#args.entries()].filter(([, {size}]) => size > 1);
	}

	/**
	 * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * `aggressive = true`时还会尝试处理连续的以数字编号的参数
	 */
	fixDuplication(aggressive = false) {
		const /** @type {string[]} */ duplicatedKeys = [];
		let anonCount = this.getAnonArgs().length;
		for (const [key, args] of this.getDuplicatedArgs()) {
			if (args.size <= 1) {
				continue;
			}
			const /** @type {Map<string, ParameterToken[]>} */ values = new Map();
			for (const arg of args) {
				const val = arg.getValue().trim();
				if (values.has(val)) {
					values.get(val).push(arg);
				} else {
					values.set(val, [arg]);
				}
			}
			let noMoreAnon = anonCount === 0 || isNaN(key);
			const entries = [...values.entries()],
				emptyArgs = entries.filter(([val]) => val === '').flatMap(([, curArgs]) => curArgs),
				duplicatedArgs = entries.filter(([val, {length}]) => val && length > 1).flatMap(([, curArgs]) => {
					const anonIndex = noMoreAnon ? -1 : curArgs.findIndex(({anon}) => anon);
					if (anonIndex !== -1) {
						noMoreAnon = true;
					}
					curArgs.splice(anonIndex, 1);
					return curArgs;
				}),
				badArgs = [...emptyArgs, ...duplicatedArgs],
				index = noMoreAnon ? -1 : badArgs.findIndex(({anon}) => anon);
			if (badArgs.length === args.size) {
				badArgs.splice(index, 1);
			} else if (index !== -1) {
				this.anonToNamed();
				anonCount = 0;
			}
			for (const arg of badArgs) {
				arg.remove();
			}
			let remaining = args.size - badArgs.length;
			if (remaining === 1) {
				continue;
			} else if (aggressive && (anonCount ? /\D\d+$/ : /(?:^|\D)\d+$/).test(key)) {
				let /** @type {number} */ last;
				const str = key.slice(0, -key.match(/\d+$/)[0].length),
					regex = new RegExp(`^${str.replace(/[\\{}()|.?*+\-^$[\]]/g, '\\$&')}\\d+$`),
					series = this.getAllArgs().filter(({name}) => regex.test(name)),
					ordered = series.every(({name}, i) => {
						const j = Number(name.slice(str.length)),
							cmp = j <= i + 1 && (i === 0 || j >= last || name === key);
						last = j;
						return cmp;
					});
				if (ordered) {
					for (const [i, arg] of series.entries()) {
						const name = `${str}${i + 1}`;
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
					: this.normalizeTitle(this.children[1]?.text() ?? '', 828)
				} 还留有 ${remaining} 个重复的 ${key} 参数！`);
				duplicatedKeys.push(key);
				continue;
			}
		}
		return duplicatedKeys;
	}
}

Parser.classes.TranscludeToken = __filename;
module.exports = TranscludeToken;
