/**
 * 是否是普通对象
 * @param obj 对象
 */
export const isPlainObject = (obj: unknown): boolean => {
	if (!obj) {
		return false;
	}
	const prototype = Object.getPrototypeOf(obj);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return prototype === null || prototype.constructor === Object;
};

/**
 * 从数组中删除指定元素
 * @param arr 数组
 * @param ele 元素
 */
export const del = <T>(arr: T[], ele: T): T[] => {
	const set = new Set(arr);
	set.delete(ele);
	return [...set];
};
