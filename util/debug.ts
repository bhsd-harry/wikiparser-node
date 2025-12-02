import type {TokenTypes, Config} from '../base';
import type {AstNodes, Token} from '../internal';

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
export const isToken = <T extends Token>(type: TokenTypes) => (node: AstNodes): node is T => node.type === type;

/**
 * 是否是行尾
 * @param token 节点
 * @param token.type 节点类型
 */
export const isRowEnd = ({type}: Token): boolean => type === 'tr' || type === 'table-syntax';

/**
 * 是否为普通内链
 * @param type 节点类型
 */
export const isLink = (type: TokenTypes): boolean => type === 'redirect-target' || type === 'link';

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
		removed = Array.prototype.splice.apply(nodes, [position, deleteCount, ...inserted]);
	}
	for (let i = 0; i < inserted.length; i++) {
		const node = inserted[i]!;
		node.setAttribute('parentNode', parent);
		node.setAttribute('nextSibling', nodes[position + i + 1]);
		node.setAttribute('previousSibling', nodes[position + i - 1]);
	}
	nodes[position - 1]?.setAttribute('nextSibling', nodes[position]);
	nodes[position + inserted.length]?.setAttribute('previousSibling', nodes[position + inserted.length - 1]);
	parent.setAttribute('childNodes', nodes);

	/* NOT FOR BROWSER */

	for (const node of removed) {
		if (node.parentNode === parent) {
			node.setAttribute('parentNode', undefined);
		}
	}

	/* NOT FOR BROWSER END */

	return removed;
};

/**
 * 获取魔术字的信息
 * @param name 魔术字
 * @param parserFunction 解析设置中的parserFunction属性
 */
export const getMagicWordInfo = (
	name: string,
	parserFunction: Config['parserFunction'],
): [string, boolean, string | false] => {
	const lcName = name.toLowerCase(),
		[insensitive, sensitive] = parserFunction,
		isSensitive = Object.prototype.hasOwnProperty.call(sensitive, name);
	return [
		lcName,
		isSensitive,
		isSensitive
			? sensitive[name]!
			: Object.prototype.hasOwnProperty.call(insensitive, lcName) && insensitive[lcName]!,
	];
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

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

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
			target.setAttribute('data', data.oldText);
			break;
		/* istanbul ignore next */
		default:
			throw new RangeError(`Unable to undo events with an unknown type: ${type}`);
	}
};

/**
 * 获取魔术字的规范名称
 * @param name 魔术字
 * @param parserFunction 解析设置中的parserFunction属性
 */
export const getCanonicalName = (name: string, parserFunction: Config['parserFunction']): [string, string | false] => {
	const [lcName,, canonicalName] = getMagicWordInfo(name, parserFunction);
	return [canonicalName || lcName, canonicalName];
};
