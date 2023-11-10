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
