import type {
	AstNodes,
	Token,
} from '../internal';

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
	let nodes = parent.getChildNodes(),
		removed: AstNodes[];
	if (nodes.length === deleteCount) {
		removed = nodes;
		nodes = inserted as AstNodes[];
	} else {
		removed = nodes.splice(position, deleteCount, ...inserted);
	}
	for (let i = 0; i < inserted.length; i++) {
		const node = inserted[i]!;
		node.setAttribute('parentNode', parent);
		node.setAttribute('nextSibling', nodes[position + i + 1]);
		node.setAttribute('previousSibling', nodes[position + i - 1]);
	}
	nodes[position - 1]?.setAttribute('nextSibling', nodes[position]);
	nodes[position + inserted.length]?.setAttribute('previousSibling', nodes[position + inserted.length - 1]);
	if (nodes === inserted) {
		parent.setAttribute('childNodes', nodes);
	}
	return removed;
};
