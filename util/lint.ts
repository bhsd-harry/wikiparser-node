import {Shadow} from './debug';
import Parser from '../index';

/**
 * 缓存计算结果
 * @param store 缓存的值
 * @param compute 计算新值的函数
 * @param update 更新缓存的函数
 * @param force 是否强制缓存
 */
export const cache = <T>(
	store: Cached<T> | undefined,
	compute: () => T,
	update: (value: Cached<T>) => void,
	force?: boolean,
): T => {
	if (store && (force || Parser.viewOnly && store[0] === Shadow.rev)) {
		return store[1];
	}
	const result = compute();
	if (force || Parser.viewOnly) {
		update([Shadow.rev, result]);
	}
	return result;
};

/**
 * 获取HTML属性值可选列表
 * @param tag 标签名
 * @param attribute 属性名
 */
export const provideValues = (tag: string, attribute: string): string[] => {
	if (tag === 'ol' && attribute === 'type') {
		return ['1', 'a', 'A', 'i', 'I'];
	} else if (tag === 'th' && attribute === 'scope') {
		return ['row', 'col', 'rowgroup', 'colgroup'];
	} else if (attribute === 'dir') {
		return ['ltr', 'rtl', 'auto'];
	}
	return attribute === 'aria-hidden' ? ['true', 'false'] : [];
};
