'use strict';

/**
 * @param {function}
 * @param {string} method
 * @param {...string} args
 */
const typeError = ({name}, method, ...args) => {
	throw new TypeError(`${name}.${method} 方法仅接受 ${args.join('、')} 作为输入参数！`);
};

/**
 * 不是被构造器或原型方法调用
 * @param {string} name
 */
const externalUse = (name, proxy = false) => {
	if (!proxy && require('..').running) {
		return false;
	}
	const regex = new RegExp(`^${
		proxy ? 'Proxy' : 'new \\w*Token$|^(?:AstNode|AstElement|\\w*Token)'
	}\\.(?!${name}$)`, 'u');
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
 * @param {AstEvent} e
 * @param {AstEventData} data
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
		case 'text': {
			const childNodes = [...target.childNodes];
			childNodes[data.position] = data.oldText;
			target.setAttribute('childNodes', childNodes);
			break;
		}
		default:
			throw new RangeError(`无法撤销未知类型的事件：${type}`);
	}
};

module.exports = {typeError, externalUse, undo};
