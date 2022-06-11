'use strict';

/**
 * @param {...string} args
 * @throws {TypeError}
 */
const typeError = (...args) => {
	throw new TypeError(`仅接受 ${args.join('、')} 作为输入参数！`);
};

/**
 * 不是被构造器或原型方法调用
 * @param {string} name
 */
const externalUse = (name, onlyNew = false, proxy = false) => {
	if (typeof name !== 'string') {
		throw new TypeError('检查外部调用时必须提供方法名！');
	}
	let /** @type {RegExp} */ regex;
	if (onlyNew) {
		regex = new RegExp(`^new ${name}$`);
	} else if (proxy) {
		regex = new RegExp(`^Proxy\\.(?!${name}$)`);
	} else {
		regex = new RegExp(`^new \\w*Token$|^(?:AstNode|AstElement|\\w*Token)\\.(?!${name}$)`);
	}
	const mt = new Error().stack.match(/(?<=^\s+at )(?:new )?[\w.]+(?= \(\/)/gm);
	return !mt.slice(2).some(func => regex.test(func));
};

/**
 * @param {ObjectConstructor} constructor
 * @param {string} method
 * @throws {Error}
 */
const debugOnly = (constructor, method) => {
	throw new Error(`${constructor.name}.${method} 方法仅用于代码调试！`);
};

module.exports = {typeError, externalUse, debugOnly};
