'use strict';

const numberToString = n => typeof n === 'number' ? String(n) : n;

const typeError = (...args) => {
	throw new TypeError(`仅接受${args.join('、')}作为输入参数！`);
};

module.exports = {numberToString, typeError};
