import {classes} from '../util/constants';
import {error} from '../util/diff';

/** 模拟Python的Range对象。除`step`至少为`1`外，允许负数、小数或`end < start`的情形。 */
export class Range {
	readonly start: number;
	readonly end: number;
	readonly step: number;

	/**
	 * @param str 表达式
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
			const [start, end, step = '1'] = str
				.split(':', 3) as [string, string | undefined, string | undefined];
			this.start = Number(start);
			this.end = Number(end?.trim() || Infinity);
			this.step = Math.max(Number(step), 1);
			/* istanbul ignore next */
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
			/* istanbul ignore else */
			if (mt) {
				const [, sgnA = '+', a = 1, sgnB = '+'] = mt,
					b = Number(mt[4] ?? 0);
				this.step = Number(a);
				/* istanbul ignore if */
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

	/** @private */
	has(i: number, length: number): boolean {
		let {start, end} = this;
		start += start < 0 ? length : 0;
		end += end < 0 ? length : 0;
		return i >= start && i < end && (i - Math.max(start, 0)) % this.step === 0;
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
		for (const ele of (Array.isArray(a) ? a : [a]) satisfies readonly (number | string | Range)[]) {
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
				} catch (e) /* istanbul ignore next */ {
					if (e instanceof RangeError) {
						error(e.message);
					}
				}
			}
		}
	}

	/**
	 * 是否包含指定的索引
	 * @param i 指定的索引
	 * @param length 序列的长度
	 */
	has(i: number, length: number): boolean {
		return i >= 0 && i < length
			&& this.some(ele => typeof ele === 'number' ? ele === i || ele + length === i : ele.has(i, length));
	}
}

classes['Ranges'] = __filename;
