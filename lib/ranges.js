'use strict';

const /** @type {Parser} */ Parser = require('..');

/** 模拟Python的Range对象。除`step`至少为`1`外，允许负数、小数或`end < start`的情形。 */
class Range {
	start;
	end;
	step;

	/** @param {string|Range} str */
	constructor(str) {
		if (str instanceof Range) {
			Object.assign(this, str);
			return;
		}
		str = str.trim();
		if (str === 'odd') {
			Object.assign(this, {start: 1, end: Infinity, step: 2});
		} else if (str === 'even') {
			Object.assign(this, {start: 0, end: Infinity, step: 2});
		} else if (str.includes(':')) {
			const [start, end, step = '1'] = str.split(':', 3);
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
		} else {
			const mt = /^([+-])?(\d+)?n(?:([+-])(\d+))?$/.exec(str);
			if (mt) {
				const [, sgnA = '+', a = 1, sgnB = '+'] = mt,
					b = Number(mt[4] ?? 0);
				this.step = Number(a);
				if (this.step === 0) {
					throw new RangeError(`参数 ${str} 中 "n" 的系数不允许为 0！`);
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
				throw new RangeError(`参数 ${str} 应写作CSS选择器的 "an+b" 形式或Python切片！`);
			}
		}
	}

	/**
	 * 将Range转换为针对特定Array的下标集
	 * @param {number|any[]} arr
	 * @complexity `n`
	 */
	applyTo(arr) {
		return new Array(typeof arr === 'number' ? arr : arr.length).fill().map((_, i) => i)
			.slice(this.start, this.end).filter((_, j) => j % this.step === 0);
	}
}

/** @extends {Array<number|Range>} */
class Ranges extends Array {
	/** @param {number|string|Range|(number|string|Range)[]} arr */
	constructor(arr) {
		super();
		if (arr === undefined) {
			return;
		}
		arr = Array.isArray(arr) ? arr : [arr];
		for (const ele of arr) {
			if (ele instanceof Range) {
				this.push(new Range(ele));
				continue;
			}
			const number = Number(ele);
			if (Number.isInteger(number)) {
				this.push(number);
			} else if (typeof ele === 'string' && Number.isNaN(number)) {
				try {
					const range = new Range(ele);
					this.push(range);
				} catch {}
			}
		}
	}

	/**
	 * 将Ranges转换为针对特定Array的下标集
	 * @param {number|any[]} arr
	 * @complexity `n`
	 */
	applyTo(arr) {
		const length = typeof arr === 'number' ? arr : arr.length;
		return [...new Set(
			this.flatMap(ele => {
				if (typeof ele === 'number') {
					return ele < 0 ? ele + length : ele;
				}
				return ele.applyTo(length);
			}),
		)].filter(i => i >= 0 && i < length).sort();
	}

	/**
	 * @param {string} str
	 * @param {number} i
	 */
	static nth(str, i) {
		return new Ranges(str.split(',')).applyTo(i + 1).includes(i);
	}
}

Parser.classes.Ranges = __filename;
module.exports = Ranges;
