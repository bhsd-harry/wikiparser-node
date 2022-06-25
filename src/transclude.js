'use strict';

const {removeComment, escapeRegExp} = require('../util/string'),
	{typeError, externalUse} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	ParameterToken = require('./parameter');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
class TranscludeToken extends Token {
	type = 'template';
	modifier = '';
	/** @type {Set<string>} */ #keys = new Set();
	/** @type {Map<string, Set<ParameterToken>>} */ #args = new Map();

	setModifier(modifier = '') {
		if (typeof modifier !== 'string') {
			typeError(this, 'setModifier', 'String');
		}
		const [,, raw, subst] = this.getAttribute('config').parserFunction,
			lcModifier = modifier.trim().toLowerCase(),
			isRaw = raw.includes(lcModifier),
			isSubst = subst.includes(lcModifier),
			wasRaw = raw.includes(this.modifier.trim().toLowerCase());
		if (wasRaw && isRaw || !wasRaw && (isSubst || modifier === '')
			|| (Parser.running || this.childElementCount > 1) && (isRaw || isSubst || modifier === '')
		) {
			this.setAttribute('modifier', modifier);
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * @param {string} title
	 * @param {[string, string|undefined][]} parts
	 * @param {accum} accum
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, SyntaxToken: 0, ParameterToken: '1:'});
		const AtomToken = require('./atom'),
			SyntaxToken = require('./syntax'),
			{parserFunction: [insensitive, sensitive, raw]} = config;
		this.seal('modifier');
		if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':');
			if (this.setModifier(modifier)) {
				title = arg.join(':');
			}
		}
		if (title.includes(':') || parts.length === 0 && !raw.includes(this.modifier.toLowerCase())) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord),
				isSensitive = sensitive.includes(name);
			if (isSensitive || insensitive.includes(name.toLowerCase())) {
				this.setAttribute('name', name.toLowerCase().replace(/^#/, '')).type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? '' : 'i'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
						'Stage-1': ':', '!ExtToken': '',
					});
				this.appendChild(token);
				if (arg.length) {
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
						}`, config, accum, {'Stage-1': ':', '!ExtToken': ''});
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
			const token = new AtomToken(title, 'template-name', config, accum, {'Stage-2': ':', '!HeadingToken': ''});
			this.appendChild(token);
		}
		const templateLike = this.matches('template, magic-word#invoke');
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
	}

	cloneNode() {
		const [first, ...cloned] = this.cloneChildren();
		Parser.running = true;
		const token = new TranscludeToken(this.type === 'template' ? '' : first.text(), [], this.getAttribute('config'));
		token.setModifier(this.modifier);
		token.firstElementChild.safeReplaceWith(first);
		token.afterBuild();
		token.append(...cloned);
		Parser.running = false;
		return token;
	}

	afterBuild() {
		super.afterBuild();
		if (this.type === 'template') {
			const name = this.firstElementChild.text();
			this.setAttribute('name', this.normalizeTitle(name, 10));
		}
		if (this.matches('template, magic-word#invoke')) {
			const that = this;
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
				if (prevTarget === that.firstElementChild && that.type === 'template') {
					that.setAttribute('name', that.normalizeTitle(prevTarget.text(), 10));
				} else if (oldKey !== newKey && prevTarget instanceof ParameterToken) {
					const oldArgs = that.getArgs(oldKey, false, false);
					oldArgs.delete(prevTarget);
					that.getArgs(newKey, false, false).add(prevTarget);
					that.#keys.add(newKey);
					if (oldArgs.size === 0) {
						that.#keys.delete(oldKey);
					}
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], transcludeListener);
		}
		return this;
	}

	subst() {
		this.setModifier('subst');
	}

	safesubst() {
		this.setModifier('safesubst');
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'args') {
			return new Map(this.#args);
		} else if (key === 'keys') {
			return !Parser.debugging && externalUse('getAttribute') ? new Set(this.#keys) : this.#keys;
		}
		return super.getAttribute(key);
	}

	toString() {
		const {children, childElementCount, firstChild} = this;
		return `{{${this.modifier}${this.modifier && ':'}${
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

	/** @returns {string} */
	text() {
		const {children, childElementCount, firstElementChild} = this;
		return `{{${this.modifier}${this.modifier && ':'}${
			this.type === 'magic-word'
				? `${firstElementChild.text()}${childElementCount > 1 ? ':' : ''}${
					children.slice(1).map(child => child.text()).join('|')
				}`
				: super.text('|')
		}}}`;
	}

	plain() {
		return this.getAllArgs().flatMap(child => child.plain());
	}

	/** @param {number|ParameterToken} addedToken */
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
		for (const [i, token] of [...args.entries()].slice(j)) {
			const {name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				this.getArgs(newName, false, false).add(token.setAttribute('name', newName));
				if (name) {
					this.getArgs(name, false, false).delete(token);
				}
			}
		}
	}

	/** @param {number} i */
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

	/** @param {ParameterToken} token */
	insertAt(token, i = this.childElementCount) {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);
			this.#keys.add(token.name);
		}
		return token;
	}

	/** @returns {ParameterToken[]} */
	getAllArgs() {
		return this.children.filter(child => child instanceof ParameterToken);
	}

	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/** @param {string|number} key */
	getArgs(key, exact = false, copy = true) {
		if (!['string', 'number'].includes(typeof key)) {
			typeError(this, 'getArgs', 'String', 'Number');
		} else if (!copy && !Parser.debugging && externalUse('getArgs')) {
			this.debugOnly('getArgs');
		}
		const keyStr = String(key).trim();
		let args = this.#args.get(keyStr);
		if (!args) {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args.set(keyStr, args);
		}
		if (exact && !isNaN(keyStr)) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}
		return args;
	}

	/** @param {string|number} key */
	hasArg(key, exact = false) {
		return this.getArgs(key, exact, false).size > 0;
	}

	/** @param {string|number} key */
	getArg(key, exact = false) {
		return [...this.getArgs(key, exact, false)].sort((a, b) => a.comparePosition(b)).at(-1);
	}

	/** @param {string|number} key */
	removeArg(key, exact = false) {
		for (const token of this.getArgs(key, exact, false)) {
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
		return [...this.getArgs(key, false, false)].map(token => token.getValue());
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

	/**
	 * @param {string} val
	 * @returns {ParameterToken}
	 */
	newAnonArg(val) {
		val = String(val);
		const templateLike = this.matches('template, magic-word#invoke'),
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${val}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches(templateLike ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2 || !firstElementChild.lastElementChild.anon
		) {
			throw new SyntaxError(`非法的匿名参数：${val.replaceAll('\n', '\\n')}`);
		}
		return this.appendChild(firstElementChild.lastChild);
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 */
	setValue(key, value) {
		if (typeof key !== 'string') {
			typeError(this, 'setValue', 'String');
		} else if (!this.matches('template, magic-word#invoke')) {
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
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('template#T')
			|| firstElementChild.childElementCount !== 2 || firstElementChild.lastElementChild.name !== key
		) {
			throw new SyntaxError(`非法的命名参数：${key}=${value.replaceAll('\n', '\\n')}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}

	anonToNamed() {
		if (!this.matches('template, magic-word#invoke')) {
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
			typeError(this, 'replaceTemplate', 'String');
		}
		const root = Parser.parse(`{{${title}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'template' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的模板名称：${title}`);
		}
		this.firstElementChild.replaceChildren(...firstElementChild.firstElementChild.childNodes);
	}

	/** @param {string} title */
	replaceModule(title) {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (typeof title !== 'string') {
			typeError(this, 'replaceModule', 'String');
		}
		const root = Parser.parse(`{{#invoke:${title}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
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
			typeError(this, 'replaceFunction', 'String');
		} else if (this.childElementCount < 2) {
			throw new Error('尚未指定模块名称！');
		}
		const root = Parser.parse(`{{#invoke:M|${func}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
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

	hasDuplicatedArgs() {
		if (!this.matches('template, magic-word#invoke')) {
			throw new Error(`${this.constructor.name}.hasDuplicatedArgs 方法仅供模板使用！`);
		}
		return this.getAllArgs().length - this.getKeys().length;
	}

	getDuplicatedArgs() {
		if (!this.matches('template, magic-word#invoke')) {
			throw new Error(`${this.constructor.name}.getDuplicatedArgs 方法仅供模板使用！`);
		}
		return [...this.#args.entries()].filter(([, {size}]) => size > 1).map(([key, args]) => [key, new Set(args)]);
	}

	/**
	 * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * `aggressive = true`时还会尝试处理连续的以数字编号的参数
	 */
	fixDuplication(aggressive = false) {
		if (!this.hasDuplicatedArgs()) {
			return [];
		}
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
				emptyArgs = values.get('') ?? [],
				duplicatedArgs = entries.filter(([val, {length}]) => val && length > 1).flatMap(([, curArgs]) => {
					const anonIndex = noMoreAnon ? -1 : curArgs.findIndex(({anon}) => anon);
					if (anonIndex !== -1) {
						noMoreAnon = true;
					}
					curArgs.splice(anonIndex, 1);
					return curArgs;
				}),
				badArgs = [...emptyArgs, ...duplicatedArgs],
				index = noMoreAnon ? -1 : emptyArgs.findIndex(({anon}) => anon);
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
					regex = new RegExp(`^${escapeRegExp(str)}\\d+$`),
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

	/** @returns {TranscludeToken} */
	escapeTables() {
		const count = this.hasDuplicatedArgs();
		if (!/\n\s*:*\s*{\|.*\n\s*\|}/s.test(this.text()) || !count) {
			return this;
		}
		const stripped = this.toString().slice(2, -2),
			include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			parsed = Parser.parse(stripped, include, 4, config),
			TableToken = require('./table');
		for (const table of parsed.children) {
			if (table instanceof TableToken) {
				table.escape();
			}
		}
		const {firstChild, childNodes} = Parser.parse(`{{${parsed.toString()}}}`, include, 2, config);
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
