'use strict';

/** @typedef {import('..')} Token */

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
	/** @type {'file'|'gallery-image'|'imagemap-image'} */ type = 'file';

	/**
	 * @param {string} link 文件名
	 * @param {string} text 图片参数
	 * @param {Token[]} accum
	 * @param {string} delimiter `|`
	 * @complexity `n`
	 */
	constructor(link, text, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
	}

	/**
	 * @override
	 * @this {import('./file')}
	 * @param {number} start 起始位置
	 */
	lint(start) {
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
					relevantArgs.at(-1),
				];
			}
			if (relevantArgs.length > 1) {
				errors.push(...relevantArgs.map(arg => generateForChild(
					arg, rect, Parser.msg('duplicated image $1 parameter', key),
				)));
			}
		}
		if (frameKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => frame.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'frame'),
				)),
			);
		}
		if (horizAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => horizAlign.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'horizontal-alignment'),
				)),
			);
		}
		if (vertAlignKeys.length > 1) {
			errors.push(
				...args.filter(({name}) => vertAlign.has(name)).map(arg => generateForChild(
					arg, rect, Parser.msg('conflicting image $1 parameter', 'vertical-alignment'),
				)),
			);
		}
		return errors;
	}

	/**
	 * 获取所有图片参数节点
	 * @this {import('./file')}
	 */
	getAllArgs() {
		const {childNodes: [, ...args]} = this;
		return args;
	}

	/**
	 * 获取指定图片参数
	 * @this {import('./file')}
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getArgs(key) {
		return this.getAllArgs().filter(({name}) => key === name);
	}

	/**
	 * 获取特定类型的图片属性参数节点
	 * @this {import('./file')}
	 * @param {Set<string>} keys 接受的参数名
	 * @param {string} type 类型名
	 * @complexity `n`
	 */
	#getTypedArgs(keys, type) {
		const args = this.getAllArgs().filter(({name}) => keys.has(name));
		return args;
	}

	/**
	 * 获取图片框架属性参数节点
	 * @this {this & import('./file')}
	 */
	getFrameArgs() {
		return this.#getTypedArgs(frame, '框架');
	}

	/**
	 * 获取图片水平对齐参数节点
	 * @this {this & import('./file')}
	 */
	getHorizAlignArgs() {
		return this.#getTypedArgs(horizAlign, '水平对齐');
	}

	/**
	 * 获取图片垂直对齐参数节点
	 * @this {this & import('./file')}
	 */
	getVertAlignArgs() {
		return this.#getTypedArgs(vertAlign, '垂直对齐');
	}
}

module.exports = FileToken;
