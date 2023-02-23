'use strict';

const {explode} = require('../../util/string'),
	{generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	LinkToken = require('.'),
	ImageParameterToken = require('../imageParameter');

const frame = new Set(['manualthumb', 'frameless', 'framed', 'thumbnail']),
	horizAlign = new Set(['left', 'right', 'center', 'none']),
	vertAlign = new Set(['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom']);

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class FileToken extends LinkToken {
	type = 'file';

	/**
	 * @param {string} link 文件名
	 * @param {string|undefined} text 图片参数
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 * @complexity `n`
	 */
	constructor(link, text, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const errors = super.lint(start),
			args = this.getAllArgs(),
			keys = [...new Set(args.map(({name}) => name))],
			frameKeys = keys.filter(key => frame.has(key)),
			horizAlignKeys = keys.filter(key => horizAlign.has(key)),
			vertAlignKeys = keys.filter(key => vertAlign.has(key));
		if (args.length === keys.length
			&& frameKeys.length < 2 && horizAlignKeys.length < 2 && vertAlignKeys.length < 2
		) {
			return errors;
		}
		const rect = {start, ...this.getRootNode().posFromIndex(start)};
		for (const key of keys) {
			let relevantArgs = args.filter(({name}) => name === key);
			if (key === 'caption') {
				relevantArgs = [
					...relevantArgs.slice(0, -1).filter(arg => arg.text()),
					relevantArgs[relevantArgs.length - 1],
				];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(arg => generateForChild(arg, rect, `重复的图片${key}参数`)));
			}
		}
		if (frameKeys.size > 1) {
			errors.push(
				...args.filter(({name}) => frame.has(name)).map(arg => generateForChild(arg, rect, '冲突的图片框架参数')),
			);
		}
		if (horizAlignKeys.size > 1) {
			errors.push(
				...args.filter(({name}) => horizAlign.has(name))
					.map(arg => generateForChild(arg, rect, '冲突的图片水平对齐参数')),
			);
		}
		if (vertAlignKeys.size > 1) {
			errors.push(
				...args.filter(({name}) => vertAlign.has(name))
					.map(arg => generateForChild(arg, rect, '冲突的图片垂直对齐参数')),
			);
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
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param {Set<string>} keys 接受的参数名
	 * @param {type} type 类型名
	 * @complexity `n`
	 */
	#getTypedArgs(keys, type) {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		return args;
	}

	/** 获取图片框架属性参数节点 */
	getFrameArgs() {
		return this.#getTypedArgs(frame, '框架');
	}

	/** 获取图片水平对齐参数节点 */
	getHorizAlignArgs() {
		return this.#getTypedArgs(horizAlign, '水平对齐');
	}

	/** 获取图片垂直对齐参数节点 */
	getVertAlignArgs() {
		return this.#getTypedArgs(vertAlign, '垂直对齐');
	}
}

module.exports = FileToken;
