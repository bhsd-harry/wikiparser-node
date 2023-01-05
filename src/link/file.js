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

	setLangLink = undefined;
	setFragment = undefined;
	asSelfLink = undefined;
	setLinkText = undefined;
	pipeTrick = undefined;

	/** 图片链接 */
	get link() {
		return this.getArg('link')?.link;
	}

	set link(value) {
		this.setValue('link', value);
	}

	/** 图片大小 */
	get size() {
		return this.getArg('width')?.size;
	}

	/** 图片宽度 */
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

	/** 图片高度 */
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
	 * @param {string} link 文件名
	 * @param {string|undefined} text 图片参数
	 * @param {Title} title 文件标题对象
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, undefined, title, config, accum);
		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
		this.seal(['setLangLink', 'setFragment', 'asSelfLink', 'setLinkText', 'pipeTrick'], true);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
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
	 * @override
	 * @param {ImageParameterToken} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running) {
			this.getArgs(token.name, false, false).add(token);
			this.#keys.add(token.name);
		}
		return super.insertAt(token, i);
	}

	/**
	 * 获取所有图片参数节点
	 * @returns {ImageParameterToken[]}
	 */
	getAllArgs() {
		return this.childNodes.slice(1);
	}

	/**
	 * 获取图片框架属性参数节点
	 * @complexity `n`
	 */
	getFrameArgs() {
		const args = this.getAllArgs()
			.filter(({name}) => ['manualthumb', 'frameless', 'framed', 'thumbnail'].includes(name));
		if (args.length > 1) {
			Parser.error(`图片 ${this.name} 带有 ${args.length} 个框架参数，只有第 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/**
	 * 获取指定图片参数
	 * @param {string} key 参数名
	 * @param {boolean} copy 是否返回备份
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
	 * 是否具有指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	hasArg(key) {
		return this.getArgs(key, false).size > 0;
	}

	/**
	 * 获取生效的指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getArg(key) {
		return [...this.getArgs(key, false)].sort((a, b) => a.comparePosition(b)).at(-1);
	}

	/**
	 * 移除指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	removeArg(key) {
		for (const token of this.getArgs(key, false)) {
			this.removeChild(token);
		}
	}

	/**
	 * 获取图片参数名
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
	 * 获取指定的图片参数值
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getValues(key) {
		return [...this.getArgs(key, false)].map(token => token.getValue());
	}

	/**
	 * 获取生效的指定图片参数值
	 * @template {string|undefined} T
	 * @param {T} key 参数名
	 * @returns {T extends undefined ? Object<string, string> : string|true}
	 * @complexity `n`
	 */
	getValue(key) {
		return key === undefined
			? Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)]))
			: this.getArg(key)?.getValue();
	}

	/**
	 * 设置图片参数
	 * @param {string} key 参数名
	 * @param {string|boolean} value 参数值
	 * @complexity `n`
	 * @throws `RangeError` 未定义的图片参数
	 * @throws `SyntaxError` 非法的参数
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
		if (length !== 1 || !firstElementChild?.matches('file#File\\:F')
			|| firstElementChild.childNodes.length !== 2 || firstElementChild.lastElementChild.name !== key
		) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		this.appendChild(firstElementChild.lastChild);
	}
}

Parser.classes.FileToken = __filename;
module.exports = FileToken;
