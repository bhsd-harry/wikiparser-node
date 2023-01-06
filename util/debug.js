'use strict';

/**
 * 定制TypeError消息
 * @param {Function} constructor 类
 * @param {string} method 方法名称
 * @param {...string} args 可接受的参数类型
 * @throws `TypeError`
 */
const typeError = ({name}, method, ...args) => {
	throw new TypeError(`${name}.${method} 方法仅接受 ${args.join('、')} 作为输入参数！`);
};

/**
 * 不是被构造器或原型方法调用
 * @param {string} name 方法名称
 */
const externalUse = name => {
	const Parser = require('..');
	if (Parser.running) {
		return false;
	}
	const regex = new RegExp(`^new \\w*Token$|^(?:AstNode|AstElement|\\w*Token)\\.(?!${name}$)`, 'u');
	try {
		throw new Error(); // eslint-disable-line unicorn/error-message
	} catch (e) {
		if (e instanceof Error) {
			const mt = e.stack.match(/(?<=^\s+at )(?:new )?[\w.]+(?= \(\/)/gmu);
			return !mt.slice(2).some(func => regex.test(func));
		}
	}
	return false;
};

/**
 * 撤销最近一次Mutation
 * @param {AstEvent} e 事件
 * @param {AstEventData} data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
const undo = (e, data) => {
	const {target, type} = e;
	switch (type) {
		case 'remove': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position, 0, data.removed);
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'insert': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position, 1);
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'replace': {
			const {parentNode} = target,
				childNodes = [...parentNode.childNodes];
			childNodes.splice(data.position, 1, data.oldToken);
			parentNode.setAttribute('childNodes', childNodes);
			break;
		}
		case 'text':
			target.replaceData(data.oldText);
			break;
		default:
			throw new RangeError(`无法撤销未知类型的事件：${type}`);
	}
};

module.exports = {typeError, externalUse, undo};
