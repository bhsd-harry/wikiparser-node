import type {TokenTypes, Config, Parser as ParserBase} from '../base';
import type {AstNodes, Token} from '../internal';

export const Shadow = {
	running: false,

	/** @private */
	run<T>(callback: () => T, Parser?: ParserBase): T {
		const {running} = this;
		this.running = true;

		/** restore state before exit */
		const finish = (): void => {
			this.running = running;
		};
		try {
			const {Token}: typeof import('../src/index') = require('../src/index');
			const result = callback();
			if (result instanceof Token && !result.getAttribute('built')) {
				result.afterBuild();
			}
			finish();
			return result;
		} catch (e) /* c8 ignore start */ {
			finish();
			throw e;
		}
		/* c8 ignore stop */
	},

	/** @private */
	internal<T>(callback: () => T, Parser: ParserBase): T {
		const result = callback();
		return result;
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

/**
 * 生成一个指定长度的空数组
 * @param length 数组长度
 * @param callback 回调函数
 */
export const emptyArray = <T>(length: number, callback: (i: number) => T): T[] =>
	Array.from({length}, (_, i) => callback(i));

/* NOT FOR BROWSER ONLY */

/**
 * 同步混入的类名
 * @param target 混入的目标
 * @param source 混入的源
 */
export const mixin = (target: Function, source: Function): void => {
	Object.defineProperty(target, 'name', {value: source.name});
};
