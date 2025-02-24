import type {
	AstNodes,
	Token,

	/* NOT FOR BROWSER */

	AstText,
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
	const nodes = parent.getChildNodes(),
		removed = nodes.splice(position, deleteCount, ...inserted);
	for (let i = 0; i < inserted.length; i++) {
		const node = inserted[i]!;
		node.setAttribute('parentNode', parent);
		node.setAttribute('nextSibling', nodes[position + i + 1]);
		node.setAttribute('previousSibling', nodes[position + i - 1]);
	}
	nodes[position - 1]?.setAttribute('nextSibling', nodes[position]);
	nodes[position + inserted.length]?.setAttribute('previousSibling', nodes[position + inserted.length - 1]);

	/* NOT FOR BROWSER */

	parent.setAttribute('childNodes', nodes);
	for (const node of removed) {
		node.setAttribute('parentNode', undefined);
	}

	/* NOT FOR BROWSER END */

	return removed;
};

/**
 * 同步混入的类名
 * @param target 混入的目标
 * @param source 混入的源
 */
export const mixin = (target: Function, source: Function): void => {
	Object.defineProperty(target, 'name', {value: source.name});
};

/* NOT FOR BROWSER */

/* istanbul ignore next */
/**
 * 定制TypeError消息
 * @param {Function} Constructor 类
 * @param method
 * @param args 可接受的参数类型
 * @throws `TypeError`
 */
export const typeError = ({name}: Function, method: string, ...args: string[]): never => {
	throw new TypeError(
		`${name}.${method} method only accepts ${args.join('、')} as input parameters!`,
	);
};

/**
 * 撤销最近一次Mutation
 * @param e 事件
 * @param data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
export const undo: AstListener = (e, data): void => {
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
			(target as AstText).replaceData(data.oldText);
			break;
		/* istanbul ignore next */
		default:
			throw new RangeError(`Unable to undo events with an unknown type: ${type}`);
	}
};
