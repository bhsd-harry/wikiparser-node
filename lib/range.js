'use strict';

const {typeError} = require('../util/debug');

/** 模拟Python的Range对象。除`step`至少为1外，允许负数、小数或`end < start`的情形。 */
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
			this.start = 1;
			this.end = Infinity;
			this.step = 2;
		} else if (str === 'even') {
			this.start = 0;
			this.end = Infinity;
			this.step = 2;
		} else if (str.includes(':')) {
			const [start, end, step = '1'] = str.split(':');
			this.start = Number(start);
			this.end = Number(end || Infinity);
			this.step = Math.max(Number(step), 1);
		}
		const mt = str.match(/([+-])?(\d+)?n([+-])?(\d+)?/);
		if (mt && Boolean(mt[3]) === Boolean(mt[4])) {
			const [, sgnA = '+',, sgnB = '+'] = mt,
				b = Number(mt[4] ?? 0);
			this.step = Number(mt[2] ?? 1);
			if (this.step === 0) {
				throw new RangeError(`参数 "an+b" 中的 a 不允许为 0！`);
			} else if (sgnA === '+') {
				this.start = sgnB === '+' || b === 0 ? b : this.step - 1 - (b - 1) % this.step;
				this.end = Infinity;
			} else if (sgnB === '-') {
				this.start = 0;
				this.end = b > 0 ? 0 : this.step;
			} else {
				this.start = b % this.step;
				this.end = this.step + b;
			}
		} else {
			throw new RangeError(`参数 ${str} 应使用 "an+b" 形式或至少包含一个 ":"！`);
		}
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
