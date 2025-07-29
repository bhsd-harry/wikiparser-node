import type {
	AstNodes,
	Token,
} from '../internal';

export const Shadow = {
	running: false,

	/** @private */
	run<T>(callback: () => T): T {
		const {running} = this;
		this.running = true;
		try {
			const {Token: AnyToken}: typeof import('../src/index') = require('../src/index');
			const result = callback();
			if (result instanceof AnyToken && !result.getAttribute('built')) {
				result.afterBuild();
			}
			this.running = running;
			return result;
		} catch (e) /* istanbul ignore next */ {
			this.running = running;
			throw e;
		}
	},

	rev: 0,
};

/**
 * 是否是某一特定类型的节点
 * @param type 节点类型
 */
export const isToken = <T extends Token>(type: string) => (node: AstNodes): node is T => node.type === type;

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

/* NOT FOR BROWSER ONLY */

/**
 * 同步混入的类名
 * @param target 混入的目标
 * @param source 混入的源
 */
export const mixin = (target: Function, source: Function): void => {
	Object.defineProperty(target, 'name', {value: source.name});
};
