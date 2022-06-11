'use strict';

const {typeError} = require('../util/debug');

/** 模拟Python的Range对象。除step至少为1外，允许负数、小数或end < start的情形。 */
class Range {
	start;
	end;
	step;

	/** @param {string} str */
	constructor(str) {
		if (typeof str !== 'string') {
			typeError('String');
		}
		str = str.trim();
		if (str === 'odd') {
			str = '1::2';
		} else if (str === 'even') {
			str = '::2';
		} else if (!str.includes(':')) {
			throw new RangeError(`参数 ${str} 应包含至少一个":"！`);
		}
		const [start, end, step = '1'] = str.split(':');
		this.start = Number(start);
		this.end = Number(end || Infinity);
		this.step = Math.max(Number(step), 1);
		if (!Number.isInteger(this.start)) {
			throw new RangeError(`起点 ${this.start} 应为整数！`);
		} else if (this.end !== Infinity && !Number.isInteger(this.end)) {
			throw new RangeError(`终点 ${this.end} 应为整数！`);
		} else if (!Number.isInteger(this.step)) {
			throw new RangeError(`步长 ${this.step} 应为整数！`);
		}
	}

	/**
	 * 将Range转换为针对特定Array的下标集
	 * @param {number|any[]} arr
	 */
	applyTo(arr) {
		if (typeof arr !== 'number' && !Array.isArray(arr)) {
			typeError('Number', 'Array');
		}
		return new Array(typeof arr === 'number' ? arr : arr.length).fill().map((_, i) => i)
			.slice(this.start, this.end).filter((_, j) => j % this.step === 0);
	}
}

class Ranges {
	/**
	 * 只包含整数和Range
	 * @type {(number|Range)[]}
	 */
	#array = [];

	/** @param {number|string|(number|string)[]} arr */
	constructor(arr) {
		if (arr === undefined) {
			return;
		}
		arr = Array.isArray(arr) ? arr : [arr];
		for (const ele of arr) {
			const number = Number(ele);
			if (Number.isInteger(number)) {
				this.#array.push(number);
			} else if (typeof ele === 'string' && Number.isNaN(number)) {
				try {
					const range = new Range(ele);
					this.#array.push(range);
				} catch {}
			}
		}
	}

	[Symbol.iterator]() {
		return this.#array[Symbol.iterator]();
	}

	valueOf() {
		return [...this.#array];
	}

	/**
	 * 将Ranges转换为针对特定Array的下标集
	 * @param {number|any[]} arr
	 */
	applyTo(arr) {
		if (typeof arr !== 'number' && !Array.isArray(arr)) {
			typeError('Number', 'Array');
		}
		const length = typeof arr === 'number' ? arr : arr.length;
		return [...new Set(
			this.#array.flatMap(ele => {
				if (typeof ele === 'number') {
					return ele < 0 ? ele + length : ele;
				}
				return ele.applyTo(length);
			}),
		)].filter(i => i >= 0 && i < length).sort();
	}

	/** @param {Ranges} ranges */
	extend(ranges) {
		if (!(ranges instanceof Ranges)) {
			typeError('Ranges');
		}
		this.#array.push(...ranges);
	}
}

/** @param {string} str */
const nth = (str, i = NaN) => {
	if (typeof str !== 'string') {
		typeError('String');
	} else if (typeof i !== 'number') {
		typeError('Number');
	} else if (Number.isNaN(i) || i < 0) {
		return false;
	}
	return new Ranges(str.split(',')).applyTo(i + 1).includes(i);
};

module.exports = {Range, Ranges, nth};
