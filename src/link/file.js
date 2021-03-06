'use strict';

const {explode, noWrap} = require('../../util/string'),
	{externalUse} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.'),
	ImageParameterToken = require('../imageParameter');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class FileToken extends LinkToken {
	type = 'file';
	/** @type {Set<string>} */ #keys = new Set();
	/** @type {Record<string, Set<ImageParameterToken>>} */ #args = {};

	setFragment = undefined;
	asSelfLink = undefined;
	setLinkText = undefined;
	pipeTrick = undefined;

	get link() {
		return this.getArg('link')?.link;
	}
	set link(value) {
		this.setValue('link', value);
	}
	get size() {
		return this.getArg('width')?.size;
	}
	get width() {
		return this.size?.width;
	}
	set width(width) {
		const arg = this.getArg('width');
		if (arg) {
			arg.width = width;
		} else {
			this.setValue('width', width);
		}
	}
	get height() {
		return this.size?.height;
	}
	set height(height) {
		const arg = this.getArg('width');
		if (arg) {
			arg.height = height;
		} else {
			this.setValue('width', `x${height}`);
		}
	}

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {Title} title
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, undefined, title, config, accum);
		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
		this.seal(['setFragment', 'asSelfLink', 'setLinkText', 'pipeTrick']);
	}

	/**
	 * @param {number} i
	 * @complexity `n`
	 */
	removeAt(i) {
		const /** @type {ImageParameterToken} */ token = super.removeAt(i),
			args = this.getArgs(token.name, false, false);
		args.delete(token);
		if (args.size === 0) {
			this.#keys.delete(token.name);
		}
		return token;
	}

	/**
	 * @param {ImageParameterToken} token
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running) {
			this.getArgs(token.name, false, false).add(token);
			this.#keys.add(token.name);
		}
		return super.insertAt(token, i);
	}

	/** @returns {ImageParameterToken[]} */
	getAllArgs() {
		return this.childNodes.slice(1);
	}

	/** @complexity `n` */
	getFrameArgs() {
		const args = this.getAllArgs()
			.filter(({name}) => ['manualthumb', 'frameless', 'framed', 'thumbnail'].includes(name));
		if (args.length > 1) {
			Parser.error(`图片 ${this.name} 带有 ${args.length} 个框架参数，只有第 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/**
	 * @param {string} key
	 * @complexity `n`
	 */
	getArgs(key, copy = true) {
		if (typeof key !== 'string') {
			this.typeError('getArgs', 'String');
		} else if (!copy && !Parser.debugging && externalUse('getArgs')) {
			this.debugOnly('getArgs');
		}
		let args = this.#args[key];
		if (!args) {
			args = new Set(this.getAllArgs().filter(({name}) => key === name));
			this.#args[key] = args;
		}
		return copy ? new Set(args) : args;
	}

	/**
	 * @param {string} key
	 * @complexity `n`
	 */
	hasArg(key) {
		return this.getArgs(key, false).size > 0;
	}

	/**
	 * @param {string} key
	 * @complexity `n`
	 */
	getArg(key) {
		return [...this.getArgs(key, false)].sort((a, b) => a.comparePosition(b)).at(-1);
	}

	/**
	 * @param {string} key
	 * @complexity `n`
	 */
	removeArg(key) {
		for (const token of this.getArgs(key, false)) {
			this.removeChild(token);
		}
	}

	/** @complexity `n` */
	getKeys() {
		const args = this.getAllArgs();
		if (this.#keys.size === 0 && args.length) {
			for (const {name} of args) {
				this.#keys.add(name);
			}
		}
		return [...this.#keys];
	}

	/**
	 * @param {string} key
	 * @complexity `n`
	 */
	getValues(key) {
		return [...this.getArgs(key, false)].map(token => token.getValue());
	}

	/**
	 * @template {string|undefined} T
	 * @param {T} key
	 * @returns {T extends undefined ? Object<string, string> : string|true}
	 * @complexity `n`
	 */
	getValue(key) {
		if (key !== undefined) {
			return this.getArg(key)?.getValue();
		}
		return Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)]));
	}

	/**
	 * @param {string} key
	 * @param {string|boolean} value
	 * @complexity `n`
	 */
	setValue(key, value) {
		if (typeof key !== 'string') {
			this.typeError('setValue', 'String');
		} else if (value === false) {
			this.removeArg(key);
			return;
		}
		const token = this.getArg(key);
		value = value === true ? value : String(value);
		if (token) {
			token.setValue(value);
			return;
		}
		let syntax = '';
		const config = this.getAttribute('config');
		if (key !== 'caption') {
			syntax = Object.entries(config.img).find(([, name]) => name === key)?.[0];
			if (!syntax) {
				throw new RangeError(`未定义的图片参数： ${key}`);
			}
		}
		if (value === true) {
			if (syntax.includes('$1')) {
				this.typeError('setValue', 'Boolean');
			}
			const newArg = Parser.run(() => new ImageParameterToken(syntax, config));
			this.appendChild(newArg);
			return;
		}
		const wikitext = `[[File:F|${syntax ? syntax.replace('$1', value) : value}]]`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 6, config),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || !firstElementChild?.matches('file#File:F')
			|| firstElementChild.childNodes.length !== 2 || firstElementChild.lastElementChild.name !== key
		) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}
}

Parser.classes.FileToken = __filename;
module.exports = FileToken;
