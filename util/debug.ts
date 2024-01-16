import type {AstNodes, Token} from '../internal';

export const Shadow = {

	/* NOT FOR BROWSER */

	running: false,

	/* NOT FOR BROWSER END */

	/** @private */
	run<T>(callback: () => T): T {
		const {running} = this;
		this.running = true;
		try {
			const result = callback();
			this.running = running;
			return result;
		} catch (e) {
			this.running = running;
			throw e;
		}
	},
};

/**
 * 生成一个指定长度的空数组
 * @param n 数组长度
 * @param callback 回调函数
 */
export const emptyArray = <T>(n: number, callback: (i: number) => T): T[] =>
	new Array(n).fill(undefined).map((_, i) => callback(i));

/**
 * 更新chldNodes
 * @param parent 父节点
 * @param position 子节点位置
 * @param deleteCount 移除的子节点数量
 * @param inserted 插入的子节点
 */
export const setChildNodes = (
	parent: Token,
	position: number,
	deleteCount: number,
	inserted: readonly AstNodes[] = [],
): AstNodes[] => {
	const childNodes = [...parent.childNodes],
		removed = childNodes.splice(position, deleteCount, ...inserted);
	parent.setAttribute('childNodes', childNodes);
	for (const node of inserted) {
		node.setAttribute('parentNode', parent);
	}
	for (const node of removed) {
		node.setAttribute('parentNode', undefined);
	}
	return removed;
};

/* NOT FOR BROWSER */

/**
 * 撤销最近一次Mutation
 * @param e 事件
 * @param data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
export const undo = (e: AstEvent, data: AstEventData): void => {
	const {target, type} = e;
	switch (data.type) {
		case 'remove':
			setChildNodes(target as Token, data.position, 0, [data.removed]);
			break;
		case 'insert':
			setChildNodes(target as Token, data.position, 1);
			break;
		case 'replace':
			setChildNodes(target.parentNode!, data.position, 1, [data.oldToken]);
			break;
		case 'text':
			if (target.type === 'text') {
				target.replaceData(data.oldText);
			}
			break;
		default:
			throw new RangeError(`无法撤销未知类型的事件：${String(type)}`);
	}
};
