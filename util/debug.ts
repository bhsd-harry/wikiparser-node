import type {TokenTypes, Config, Parser as ParserBase} from '../base';
import type {AstNodes, Token} from '../internal';

export const Shadow = {
	/** @private */
	run<T>(callback: () => T, Parser?: ParserBase): T {
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
	if (nodes === inserted) {
		parent.setAttribute('childNodes', nodes);
	}
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
