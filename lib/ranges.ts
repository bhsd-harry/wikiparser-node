import * as Parser from '../index';

/** 模拟Python的Range对象。除`step`至少为`1`外，允许负数、小数或`end < start`的情形。 */
class Range {
	start: number;
	end: number;
	step: number;

	/**
	 * @param s 表达式
	 * @throws `RangeError` 起点、终点和步长均应为整数
	 * @throws `RangeError` n的系数不能为0
	 * @throws `RangeError` 应使用CSS选择器或Python切片的格式
	 */
	constructor(s: string | Range) {
		if (s instanceof Range) {
			Object.assign(this, s);
			return;
		}
		const str = s.trim();
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
			const mt = /^([+-])?(\d+)?n(?:([+-])(\d+))?$/u
				.exec(str) as [string, string | undefined, string | undefined, string | undefined, string | undefined] | null;
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
	 * 将Range转换为针对特定数组的下标集
	 * @param arr 参考数组
	 */
	applyTo(arr: number | unknown[]): number[] {
		return new Array(typeof arr === 'number' ? arr : arr.length).fill(undefined).map((_, i) => i)
			.slice(this.start, this.end)
			.filter((_, j) => j % this.step === 0);
	}
}

/** @extends {Array<number|Range>} */
class Ranges extends Array<number | Range> {
	/** @param a 表达式数组 */
	constructor(a?: number | string | Range | (number | string | Range)[]) {
		super();
		if (a === undefined) {
			return;
		}
		const arr = Array.isArray(a) ? a : [a];
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
	 * @param arr 参考数组
	 */
	applyTo(arr: number | unknown[]): number[] {
		const length = typeof arr === 'number' ? arr : arr.length;
		return [
			...new Set(
				[...this].flatMap(ele => {
					if (typeof ele === 'number') {
						return ele < 0 ? ele + length : ele;
					}
					return ele.applyTo(length);
				}),
			),
		].filter(i => i >= 0 && i < length).sort();
	}

	/**
	 * 检查某个下标是否符合表达式
	 * @param str 表达式
	 * @param i 待检查的下标
	 */
	static nth(this: void, str: string, i: number): boolean {
		return new Ranges(str.split(',')).applyTo(i + 1).includes(i);
	}
}

declare namespace Ranges {
	export {Range};
}

Parser.classes['Ranges'] = __filename;
export = Ranges;
