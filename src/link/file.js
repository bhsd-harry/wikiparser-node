'use strict';

const {explode} = require('../../util/string'),
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

	/**
	 * @param {string} link 文件名
	 * @param {string|undefined} text 图片参数
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 * @complexity `n`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, undefined, title, config, accum, delimiter);
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
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
			realCaptions = [...captions.slice(0, -1).filter(arg => arg.text()), captions[captions.length - 1]];
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
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @param {Set<string>} keys 接受的参数名
	 * @complexity `n`
	 */
	#getTypedArgs(keys) {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
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
}

module.exports = FileToken;
