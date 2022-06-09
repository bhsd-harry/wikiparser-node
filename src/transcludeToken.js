'use strict';

const {removeComment} = require('../util/string'),
	{typeError, externalUse, debugOnly} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	AtomToken = require('./atomToken'),
	ParameterToken = require('./parameterToken');

class TranscludeToken extends Token {
	type = 'template';
	/** @type {Set<string>} */ #keys = new Set();
	/** @type {Map<string, Set<ParameterToken>>} */ #args = new Map();

	/**
	 * @param {string} title
	 * @param {[string|number, string|undefined][]} parts
	 * @param {accum} accum
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(null, config, true, accum, {AtomToken: 0, ParameterToken: '1:'});
		const {parserFunction: [sensitive, insensitive]} = config;
		if (parts.length === 0 || title.includes(':')) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord);
			if (sensitive.includes(name) || insensitive.includes(name.toLowerCase())) {
				this.setAttribute('name', name.toLowerCase().replace(/^#/, ''));
				this.type = 'magic-word';
				const token = new AtomToken(magicWord, 'magic-word-name', accum, {
					String: ':', CommentToken: ':', NoincludeToken: ':', IncludeToken: ':',
				});
				this.appendChild(token);
				if (arg.length) {
					parts.unshift([arg.join(':')]);
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title);
			if (/\x00\d+e\x7f|[#<>[\]{}]/.test(name)) {
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			const token = new AtomToken(title, 'template-name', accum, {
				String: ':', CommentToken: ':', NoincludeToken: ':', ArgToken: ':', TranscludeToken: ':',
			});
			this.appendChild(token);
		}
		let i = 1;
		for (const part of parts) {
			if (this.type === 'magic-word') {
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
		if (this.type === 'magic-word') {
			return;
		}
		/**
		 * 当事件bubble到parameter时，将oldKey和newKey保存进AstEventData。
		 * 当继续bubble到template时，处理并删除oldKey和newKey。
		 * @type {AstListener}
		 */
		const transcludeListener = ({prevTarget}, data) => {
			const {oldKey, newKey} = data;
			if (typeof oldKey === 'string') {
				delete data.oldKey;
				delete data.newKey;
			}
			if (prevTarget instanceof ParameterToken && oldKey !== newKey) {
				const oldArgs = this.getArgs(oldKey, false);
				oldArgs.delete(prevTarget);
				this.getArgs(newKey, false).add(prevTarget);
				this.#keys.add(newKey);
				if (oldArgs.size === 0) {
					this.#keys.delete(oldKey);
				}
			} else if (prevTarget instanceof AtomToken) {
				this.setAttribute('name', this.normalizeTitle(prevTarget.text(), 10));
			}
		};
		this.addEventListener('remove', transcludeListener);
		this.addEventListener('insert', transcludeListener);
		this.addEventListener('replace', transcludeListener);
	}

	/** @param {PropertyKey} key */
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
		return this.type === 'magic-word'
			? `{{${String(firstChild)}${childElementCount > 1 ? ':' : ''}${children.slice(1).map(String).join('|')}}}`
			: `{{${super.toString('|')}}}`;
	}

	text() {
		const {children, childElementCount, firstElementChild} = this;
		return this.type === 'magic-word'
			? `{{${firstElementChild.text()}${childElementCount > 1 ? ':' : ''}${
				children.slice(1).map(child => child.text()).join('|')
			}}}`
			: `{{${super.text('|')}}}`;
	}

	/** @param {ParameterToken} addedToken */
	#handleAnonArgChange(addedToken) {
		const args = this.getAnonArgs(),
			maxAnon = String(args.length + (addedToken ? 0 : 1));
		if (addedToken) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon)) {
			this.#keys.delete(maxAnon);
		}
		const j = addedToken ? args.indexOf(addedToken) : 0;
		for (const [i, token] of [...args.entries()].slice(j)) {
			const {name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false).add(token);
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
		return super.afterBuild();
	}

	/** @returns {ParameterToken[]} */
	getAllArgs() {
		return this.children.slice(1);
	}

	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/** @param {string|number} key */
	getArgs(key, copy = true) {
		if (!['string', 'number'].includes(typeof key)) {
			typeError('String', 'Number');
		} else if (!copy && !Parser.debugging && externalUse('getArgs')) {
			debugOnly(this.constructor, 'getArgs');
		}
		key = String(key).trim();
		let args = this.#args.get(key);
		if (!args) {
			args = new Set(this.getAllArgs().filter(({name}) => key === name));
			this.#args.set(key, args);
		}
		return copy ? new Set(args) : args;
	}

	/** @param {string|number} key */
	hasArg(key) {
		return this.getArgs(key).size > 0;
	}

	/** @param {string|number} key */
	getArg(key, exact = false) {
		const args = [...this.getArgs(key)].reverse();
		return exact ? args.find(({anon}) => typeof key === 'number' === anon) : args[0] ?? null;
	}

	/** @param {string|number} key */
	removeArg(key) {
		for (const token of this.getArgs(key)) {
			this.removeChild(token);
		}
	}

	getKeys() {
		if (this.#keys.size === 0 && this.childElementCount) {
			for (const {name} of this.getAllArgs()) {
				this.#keys.add(name);
			}
		}
		return [...this.#keys];
	}

	/** @param {string|number} key */
	getValues(key) {
		return [...this.getArgs(key)].map(token => token.getValue());
	}

	/**
	 * @template {string|number|undefined} T
	 * @param {T} key
	 * @returns {T extends undefined ? Object<string, string> : string}
	 */
	getValue(key) {
		if (key !== undefined) {
			return this.getValues(key).at(-1);
		}
		return Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)]));
	}

	newAnonArg(val) {
		const isTemplate = this.type === 'template',
			root = new Token(`{{${isTemplate ? ':T|' : 'lc:'}${String(val)}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild.matches(isTemplate ? 'template#T' : 'magic-word#lc')
			|| firstElementChild.childElementCount !== 2 || !firstElementChild.lastElementChild.anon
		) {
			throw new SyntaxError(`非法的匿名参数：${String(val).replaceAll('\n', '\\n')}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}

	/** @param {string} key */
	setValue(key, value) {
		if (typeof key !== 'string') {
			typeError('String');
		} else if (this.type === 'magic-word') {
			throw new Error(`${this.constructor.name}.setValue 方法仅供模板使用！`);
		}
		const token = this.getArg(key);
		if (token) {
			token.setValue(value);
			return;
		}
		const root = new Token(`{{:T|${key}=${String(value)}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild.matches('template#T')
			|| firstElementChild.childElementCount !== 2 || firstElementChild.lastElementChild.name !== key
		) {
			throw new SyntaxError(`非法的命名参数：${key}=${String(value).replaceAll('\n', '\\n')}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}

	anonToNamed() {
		for (const token of this.getAnonArgs()) {
			token.anon = false;
			token.firstElementChild.replaceChildren(token.name);
		}
	}

	/** @param {string} title */
	replaceTemplate(title) {
		if (this.type === 'magic-word') {
			throw new Error(`${this.constructor.name}.replaceTemplate方法仅用于更换模板！`);
		} else if (typeof title !== 'string') {
			typeError('String');
		}
		const root = new Token(`{{${title}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild.type !== 'template' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的模板名称：${title}`);
		}
		this.setAttribute('name', firstElementChild.name)
			.firstElementChild.replaceChildren(...firstElementChild.firstElementChild.childNodes);
	}
}

Parser.classes.TranscludeToken = __filename;
module.exports = TranscludeToken;
