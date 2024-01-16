import type {AstNodes, Token} from '../internal';

export const Shadow = {
	/** @private */
	run<T>(callback: () => T): T {
		const result = callback();
		return result;
	},
};

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
	inserted: AstNodes[] = [],
): AstNodes[] => {
	const childNodes = [...parent.childNodes],
		removed = childNodes.splice(position, deleteCount, ...inserted);
	for (const node of inserted) {
		node.setAttribute('parentNode', parent);
	}
	return removed;
};
