'use strict';
const string_1 = require('../../util/string');
const {explode, noWrap} = string_1;
const lint_1 = require('../../util/lint');
const {generateForChild} = lint_1;
const Parser = require('../../index');
const LinkBaseToken = require('./base');
const ImageParameterToken = require('../imageParameter');
const frame = new Set(['manualthumb', 'frameless', 'framed', 'thumbnail']),
	horizAlign = new Set(['left', 'right', 'center', 'none']),
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class FileToken extends LinkBaseToken {
	/** @browser */
	type = 'file';

	/** 图片链接 */
	get link() {
		return this.getArg('link')?.link ?? super.link;
	}

	set link(value) {
		this.setValue('link', String(value));
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
			this.setValue('width', height && `x${height}`);
		}
	}

	/**
	 * @browser
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link, text, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		this.setAttribute('acceptable', {AtomToken: 0, ImageParameterToken: '1:'});
		this.append(...explode('-{', '}-', '|', text).map(
			part => new ImageParameterToken(part, config, accum),
		));
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			args = this.getAllArgs().filter(({childNodes}) => {
				const visibleNodes = childNodes.filter(node => node.text().trim());
				return visibleNodes.length !== 1 || visibleNodes[0].type !== 'arg';
			}),
			keys = [...new Set(args.map(({name}) => name))].filter(key => key !== 'invalid'),
			frameKeys = keys.filter(key => frame.has(key)),
			horizAlignKeys = keys.filter(key => horizAlign.has(key)),
			vertAlignKeys = keys.filter(key => vertAlign.has(key));
		if (args.length === keys.length
			&& frameKeys.length < 2 && horizAlignKeys.length < 2 && vertAlignKeys.length < 2) {
			return errors;
		}
		const rect = {start, ...this.getRootNode().posFromIndex(start)};
		for (const key of keys) {
			let relevantArgs = args.filter(({name}) => name === key);
			if (key === 'caption') {
				relevantArgs = [
					...relevantArgs.slice(0, -1).filter(arg => arg.text()),
					...relevantArgs.slice(-1),
				];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(arg => generateForChild(arg, rect, Parser.msg('duplicated image $1 parameter', key))));
			}
		}
		if (frameKeys.length > 1) {
			errors.push(...args.filter(({name}) => frame.has(name)).map(arg => generateForChild(arg, rect, Parser.msg('conflicting image $1 parameter', 'frame'))));
		}
		if (horizAlignKeys.length > 1) {
			errors.push(...args.filter(({name}) => horizAlign.has(name)).map(arg => generateForChild(arg, rect, Parser.msg('conflicting image $1 parameter', 'horizontal-alignment'))));
		}
		if (vertAlignKeys.length > 1) {
			errors.push(...args.filter(({name}) => vertAlign.has(name)).map(arg => generateForChild(arg, rect, Parser.msg('conflicting image $1 parameter', 'vertical-alignment'))));
		}
		return errors;
	}

	/**
	 * 获取所有图片参数节点
	 * @browser
	 */
	getAllArgs() {
		const {childNodes: [, ...args]} = this;
		return args;
	}

	/**
	 * 获取指定图片参数
	 * @browser
	 * @param key 参数名
	 */
	getArgs(key) {
		return typeof key === 'string'
			? this.getAllArgs().filter(({name}) => key === name)
			: this.typeError('getArgs', 'String');
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @browser
	 * @param keys 接受的参数名
	 * @param type 类型名
	 */
	#getTypedArgs(keys, type) {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		if (args.length > 1) {
			Parser.warn(`图片 ${this.name} 带有 ${args.length} 个${type}参数，只有最后 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/**
	 * 获取图片框架属性参数节点
	 * @browser
	 */
	getFrameArgs() {
		return this.#getTypedArgs(frame, '框架');
	}

	/**
	 * 获取图片水平对齐参数节点
	 * @browser
	 */
	getHorizAlignArgs() {
		return this.#getTypedArgs(horizAlign, '水平对齐');
	}

	/**
	 * 获取图片垂直对齐参数节点
	 * @browser
	 */
	getVertAlignArgs() {
		return this.#getTypedArgs(vertAlign, '垂直对齐');
	}

	/**
	 * 获取生效的指定图片参数
	 * @param key 参数名
	 */
	getArg(key) {
		return this.getArgs(key).at(-1);
	}

	/**
	 * 是否具有指定图片参数
	 * @param key 参数名
	 */
	hasArg(key) {
		return this.getArgs(key).length > 0;
	}

	/**
	 * 移除指定图片参数
	 * @param key 参数名
	 */
	removeArg(key) {
		for (const token of this.getArgs(key)) {
			this.removeChild(token);
		}
	}

	/** 获取图片参数名 */
	getKeys() {
		return new Set(this.getAllArgs().map(({name}) => name));
	}

	/**
	 * 获取指定的图片参数值
	 * @param key 参数名
	 */
	getValues(key) {
		return this.getArgs(key).map(token => token.getValue());
	}

	/**
	 * 获取生效的指定图片参数值
	 * @param key 参数名
	 */
	getValue(key) {
		return this.getArg(key)?.getValue();
	}

	/**
	 * 设置图片参数
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `RangeError` 未定义的图片参数
	 * @throws `SyntaxError` 非法的参数
	 */
	setValue(key, value = false) {
		if (typeof key !== 'string') {
			this.typeError('setValue', 'String');
		} else if (value === false) {
			this.removeArg(key);
			return;
		}
		const token = this.getArg(key);
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
			{length, firstChild: file} = root;
		if (length !== 1 || file.type !== 'file' || file.length !== 2) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		const {name, lastChild: imageParameter} = file;
		if (name !== 'File:F' || imageParameter.name !== key) {
			throw new SyntaxError(`非法的 ${key} 参数：${noWrap(value)}`);
		}
		this.insertAt(imageParameter);
	}
}
Parser.classes.FileToken = __filename;
module.exports = FileToken;
