'use strict';

/**
 * 是否是普通对象
 * @param {*} obj 对象
 */
const isPlainObject = obj => Boolean(obj) && Object.getPrototypeOf(obj).constructor === Object;

module.exports = {isPlainObject};
