'use strict';

const Title = require('../../lib/title'),
	{explode, noWrap} = require('../../util/string'),
	{generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	LinkToken = require('.'),
	ImageParameterToken = require('../imageParameter');

const frameKeys = new Set(['manualthumb', 'frameless', 'framed', 'thumbnail']),
	horizAlignKeys = new Set(['left', 'right', 'center', 'none']),
	vertAlignKeys = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class FileToken extends LinkToken {
	type = 'file';

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
			realCaptions = [...captions.slice(0, -1).filter(arg => arg.text()), captions.at(-1)];
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
	 * @complexity `n`
	 */
	getArgs(key) {
		return typeof key === 'string'
			? this.getAllArgs().filter(({name}) => key === name)
			: this.typeError('getArgs', 'String');
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param {Set<string>} keys 接受的参数名
	 * @param {type} type 类型名
	 * @complexity `n`
	 */
	#getTypedArgs(keys, type) {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		if (args.length > 1) {
			Parser.warn(`图片 ${this.name} 带有 ${args.length} 个${type}参数，只有第 1 个 ${args[0].name} 会生效！`);
		}
		return args;
	}

	/** 获取图片框架属性参数节点 */
	getFrameArgs() {
		return this.#getTypedArgs(frameKeys, '框架');
	}

	/** 获取图片水平对齐参数节点 */
	getHorizAlignArgs() {
		return this.#getTypedArgs(horizAlignKeys, '水平对齐');
	}

	/** 获取图片垂直对齐参数节点 */
	getVertAlignArgs() {
		return this.#getTypedArgs(vertAlignKeys, '垂直对齐');
	}

	/**
	 * 获取生效的指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getArg(key) {
		return this.getArgs(key).at(frameKeys.has(key) || horizAlignKeys.has(key) || vertAlignKeys.has(key) ? 0 : -1);
	}

	/**
	 * 是否具有指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	hasArg(key) {
		return this.getArgs(key).length > 0;
	}

	/**
	 * 移除指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	removeArg(key) {
		for (const token of this.getArgs(key)) {
			this.removeChild(token);
		}
	}

	/**
	 * 获取图片参数名
	 * @complexity `n`
	 */
	getKeys() {
		return new Set(this.getAllArgs().map(({name}) => name));
	}

	/**
	 * 获取指定的图片参数值
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getValues(key) {
		return this.getArgs(key).map(token => token.getValue());
	}

	/**
	 * 获取生效的指定图片参数值
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getValue(key) {
		return this.getArg(key)?.getValue();
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
}

Parser.classes.FileToken = __filename;
module.exports = FileToken;
