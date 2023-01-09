'use strict';

const {explode} = require('../../util/string'),
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

	/**
	 * @param {string} link 文件名
	 * @param {string|undefined} text 图片参数
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(link, text, config = Parser.getConfig(), accum = []) {
		super(link, undefined, config, accum);
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			frameArgs = this.getFrameArgs(),
			captions = this.getArgs('caption');
		if (frameArgs.length > 1 || captions.size > 1) {
			const rect = this.getRootNode().posFromIndex(start);
			if (frameArgs.length > 1) {
				errors.push(...frameArgs.map(arg => generateForChild(arg, rect, '重复或冲突的图片框架参数')));
			}
			if (captions.size > 1) {
				errors.push(...[...captions].map(arg => generateForChild(arg, rect, '重复的图片说明')));
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
	 * 获取图片框架属性参数节点
	 * @complexity `n`
	 */
	getFrameArgs() {
		return this.getAllArgs().filter(({name}) => ['manualthumb', 'frameless', 'framed', 'thumbnail'].includes(name));
	}

	/**
	 * 获取指定图片参数
	 * @param {string} key 参数名
	 * @complexity `n`
	 */
	getArgs(key) {
		return new Set(this.getAllArgs().filter(({name}) => key === name));
	}
}

module.exports = FileToken;
