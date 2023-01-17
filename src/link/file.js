'use strict';

const Title = require('../../lib/title'),
	{explode, noWrap} = require('../../util/string'),
	{externalUse} = require('../../util/debug'),
	{generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
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
	 * @param {string} delimiter `|`
	 * @complexity `n`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, undefined, title, config, accum, delimiter);
		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
		this.seal(
			['selfLink', 'interwiki', 'setLangLink', 'setFragment', 'asSelfLink', 'setLinkText', 'pipeTrick'],
			true,
		);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			frameArgs = this.getFrameArgs(),
			horizAlignArgs = this.getHorizAlignArgs(),
			vertAlignArgs = this.getVertAlignArgs(),
			captions = this.getArgs('caption'),
			realCaptions = [...captions].filter((arg, i) => arg.text() || i === captions.size - 1);
		if (frameArgs.length > 1 || horizAlignArgs.length > 1 || vertAlignArgs.length > 1 || captions.size > 1) {
			const rect = this.getRootNode().posFromIndex(start);
			if (frameArgs.length > 1) {
				errors.push(...frameArgs.map(arg => generateForChild(arg, rect, '重复或冲突的图片框架参数')));
			}
			if (horizAlignArgs.length > 1) {
				errors.push(...horizAlignArgs.map(arg => generateForChild(arg, rect, '重复或冲突的图片水平对齐参数')));
			}
			if (vertAlignArgs.length > 1) {
				errors.push(...vertAlignArgs.map(arg => generateForChild(arg, rect, '重复或冲突的图片垂直对齐参数')));
			}
			if (realCaptions.length > 1) {
				errors.push(...realCaptions.map(arg => generateForChild(arg, rect, '重复的图片说明')));
			}
		}
		return errors;
	}

	/**
	 * 获取所有图片参数节点
	 * @returns {ImageParameterToken[]}
	 */
	getAllArgs() {
		return this.childNodes.slice(1);
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
		}
		copy ||= !Parser.debugging && externalUse('getArgs');
		let args;
		if (Object.hasOwn(this.#args, key)) {
			args = this.#args[key];
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => key === name));
			this.#args[key] = args;
		}
		return copy ? new Set(args) : args;
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
	 * 获取图片水平对齐参数节点
	 * @complexity `n`
	 */
	getHorizAlignArgs() {
		const args = this.getAllArgs()
			.filter(({name}) => ['left', 'right', 'center', 'none'].includes(name));
		if (args.length > 1) {
			Parser.error(`图片 ${this.name} 带有 ${args.length} 个水平对齐参数，只有第 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/**
	 * 获取图片垂直对齐参数节点
	 * @complexity `n`
	 */
	getVertAlignArgs() {
		const args = this.getAllArgs().filter(
			({name}) => ['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']
				.includes(name),
		);
		if (args.length > 1) {
			Parser.error(`图片 ${this.name} 带有 ${args.length} 个垂直对齐架参数，只有第 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/**
	 * 获取生效的指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getArg(key) {
		return [...this.getArgs(key, false)].sort((a, b) => a.compareDocumentPosition(b)).at(-1);
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
	 * @returns {T extends undefined ? Record<string, string> : string|true}
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
			this.insertAt(newArg);
			return;
		}
		const wikitext = `[[File:F|${syntax ? syntax.replace('$1', value) : value}]]`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 6, config),
			{length, firstChild: file} = root,
			{name, type, length: fileLength, lastChild: imageParameter} = file;
		if (length !== 1 || type !== 'file' || name !== 'File:F' || fileLength !== 2 || imageParameter.name !== key) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		this.insertAt(imageParameter);
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
}

Parser.classes.FileToken = __filename;
module.exports = FileToken;
