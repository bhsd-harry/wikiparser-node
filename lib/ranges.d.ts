/** 模拟Python的Range对象。除`step`至少为`1`外，允许负数、小数或`end < start`的情形。 */
declare class Range {
	/**
	 * @param str 表达式
	 * @throws `RangeError` 起点、终点和步长均应为整数
	 * @throws `RangeError` n的系数不能为0
	 * @throws `RangeError` 应使用CSS选择器或Python切片的格式
	 */
	constructor(str: string|Range);
	start: number;
	end: number;
	step: number;

	/**
	 * 将Range转换为针对特定数组的下标集
	 * @param arr 参考数组
	 */
	applyTo(arr: number|unknown[]): number[];
}

/** @extends {Array<number|Range>} */
declare class Ranges extends Array<number|Range> {
	/**
	 * 检查某个下标是否符合表达式
	 * @param str 表达式
	 * @param i 待检查的下标
	 */
	static nth(str: string, i: number): boolean;
	/** @param arr 表达式数组 */
	constructor(arr?: number|string|Range|(number|string|Range)[]);

	/**
	 * 将Ranges转换为针对特定Array的下标集
	 * @param arr 参考数组
	 */
	applyTo(arr: number|unknown[]): number[];
}

declare namespace Ranges {
	export {Range};
}

export = Ranges;
