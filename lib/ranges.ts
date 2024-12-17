import {classes} from '../util/constants';
import {emptyArray} from '../util/debug';
import {error} from '../util/diff';

/** 模拟Python的Range对象。除`step`至少为`1`外，允许负数、小数或`end < start`的情形。 */
export class Range {
	readonly start: number;
	readonly end: number;
	readonly step: number;

	/**
	 * @param s 表达式
	 * @throws `RangeError` 起点、终点和步长均应为整数
	 * @throws `RangeError` n的系数不能为0
	 * @throws `RangeError` 应使用CSS选择器或Python切片的格式
	 */
	constructor(str: string) {
		str = str.trim();
		if (str === 'odd') {
			Object.assign(this, {start: 1, end: Infinity, step: 2});
		} else if (str === 'even') {
			Object.assign(this, {start: 0, end: Infinity, step: 2});
		} else if (str.includes(':')) {
			const [start, end, step = '1'] = str.split(':', 3) as [string, string | undefined, string | undefined];
			this.start = Number(start);
			this.end = Number(end?.trim() || Infinity);
			this.step = Math.max(Number(step), 1);
			if (!Number.isInteger(this.start)) {
				throw new RangeError(`The start of a range, \`${start}\`, should be an integer!`);
			} else if (this.end !== Infinity && !Number.isInteger(this.end)) {
				throw new RangeError(`The end of a range, \`${end}\`, should be an integer!`);
			} else if (!Number.isInteger(this.step)) {
				throw new RangeError(`The step of a range, \`${step}\`, should be an integer!`);
			}
		} else {
			const mt = /^([+-])?(\d+)?n(?:\s*([+-])\s*(\d+))?$/u
				.exec(str) as [string, string | undefined, string | undefined, string | undefined, string | undefined]
				| null;
			if (mt) {
				const [, sgnA = '+', a = 1, sgnB = '+'] = mt,
					b = Number(mt[4] ?? 0);
				this.step = Number(a);
				if (this.step === 0) {
					throw new RangeError(`In the argument \`${str}\`, the coefficient of "n" must not be 0!`);
				} else if (sgnA === '+') { // `an+b` or `an-b`
					this.start = sgnB === '+' || b === 0 ? b : this.step - 1 - (b - 1) % this.step;
					this.end = Infinity;
				} else if (sgnB === '-') { // `-an-b`
					this.start = 0;
					this.end = b > 0 ? 0 : this.step;
				} else { // `-an+b`
					this.start = b % this.step;
					this.end = this.step + b;
				}
			} else {
				throw new RangeError(`The argument \`${
					str
				}\` should be either in the form of "an+b" as in CSS selectors or Python slices!`);
			}
		}
	}

	/**
	 * 将Range转换为针对特定数组的下标集
	 * @param arr 参考数组`[0, 1, 2, ...]`
	 */
	applyTo(arr: readonly number[]): number[] {
		return arr.slice(this.start, this.end).filter((_, j) => j % this.step === 0);
	}
}

/** @extends {Array<number|Range>} */
export class Ranges extends Array<number | Range> {
	/** @param a 表达式数组 */
	constructor(a?: number | string | Range | readonly (number | string | Range)[]) {
		super();
		if (a === undefined) {
			return;
		}
		for (const ele of (Array.isArray(a) ? a : [a]) as readonly (number | string | Range)[]) {
			if (ele instanceof Range) {
				this.push(ele);
				continue;
			} else if (typeof ele === 'string' && !ele.trim()) {
				continue;
			}
			const number = Number(ele);
			if (Number.isInteger(number)) {
				this.push(number);
			} else if (typeof ele === 'string' && Number.isNaN(number)) {
				try {
					this.push(new Range(ele));
				} catch (e) {
					if (e instanceof RangeError) {
						error(e.message);
					}
				}
			}
		}
	}

	/**
	 * 将Ranges转换为针对特定Array的下标集
	 * @param arr 参考数组
	 */
	applyTo(arr: number | readonly unknown[]): number[] {
		const length = typeof arr === 'number' ? arr : arr.length,
			a = emptyArray(length, i => i);
		return [
			...new Set(
				[...this].flatMap(ele => { // eslint-disable-line es-x/no-array-prototype-flat
					if (typeof ele === 'number') {
						return ele < 0 ? ele + length : ele;
					}
					return ele.applyTo(a);
				}),
			),
		].filter(i => i >= 0 && i < length).sort();
	}
}

classes['Ranges'] = __filename;
