'use strict';

/**
 * 是否是普通对象
 * @param obj 对象
 */
const isPlainObject = obj => {
	if (!obj) {
		return false;
	}
	const prototype = Object.getPrototypeOf(obj);
	return prototype === null || prototype.constructor === Object;
};
exports.isPlainObject = isPlainObject;

/**
 * 延时
 * @param {number} t 秒数
 */
const sleep = t => new Promise(resolve => {
	setTimeout(resolve, t * 1000);
});
exports.sleep = sleep;

/**
 * 从数组中删除指定元素
 * @param arr 数组
 * @param ele 元素
 */
const del = (arr, ele) => {
	const set = new Set(arr);
	set.delete(ele);
	return [...set];
};
exports.del = del;
