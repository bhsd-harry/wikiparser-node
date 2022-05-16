'use strict';
const {typeError} = require('./util');

/** 模拟Python的Range对象。除step至少为1外，允许负数、小数或end < start的情形。 */
class Range {
	start;
	end;
	step;

	/** @param {string} str */
	constructor(str) {
		str = str.trim();
		if (str === 'odd') {
			str = '1::2';
		} else if (str === 'even') {
			str = '::2';
		}
		const [start, end, step = '1'] = str.split(':');
		this.start = Number(start);
		this.end = Number(end || Infinity);
		this.step = Math.max(Number(step), 1);
		if (Number.isNaN(this.start) || Number.isNaN(this.end) || Number.isNaN(this.step)) {
			throw new RangeError('参数中包含NaN！');
		}
	}

	/**
	 * 将Range转换为针对特定Array的下标集
	 * @param {array} arr
	 */
	applyTo(arr) {
		if (!Array.isArray(arr)) {
			typeError('Array');
		}
		return new Array(arr.length).fill().map((_, i) => i)
			.slice(this.start, this.end).filter((_, j) => j % this.step === 0);
	}
}

class Ranges extends Array {
	/**
	 * @param {(number|string)[]} arr
	 * @returns {(number|Range)[]}
	 */
	constructor(arr) {
		if (arr === 0) {
			super();
			return;
		} else if (!Array.isArray(arr)) {
			typeError('Array');
		}
		super(
			...arr.filter(ele => ['number', 'string'].includes(typeof ele)).map(ele => {
				try {
					return isNaN(ele) ? new Range(ele) : Number(ele);
				} catch {}
				return null;
			}).filter(ele => ele !== null),
		);
	}

	/**
	 * 将Ranges转换为针对特定Array的下标集
	 * @param {array} arr
	 */
	applyTo(arr) {
		if (!Array.isArray(arr)) {
			typeError('Array');
		}
		return [...new Set(
			this.flatMap(ele => {
				if (typeof ele === 'number' && Number.isInteger(ele)) {
					return ele < 0 ? ele + arr.length : ele;
				} else if (ele instanceof Range) {
					return ele.applyTo(arr);
				}
				return [];
			}),
		)].filter(i => i >= 0 && i < arr.length).sort();
	}
}

module.exports = {Range, Ranges};
