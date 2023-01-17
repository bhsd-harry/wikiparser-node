'use strict';

/**
 * 是否是普通对象
 * @param {*} obj 对象
 */
const isPlainObject = obj => Boolean(obj) && Object.getPrototypeOf(obj).constructor === Object;

/**
 * 延时
 * @param {number} t 秒数
 */
const sleep = t => new Promise(resolve => {
	setTimeout(resolve, t * 1000);
});

module.exports = {isPlainObject, sleep};
