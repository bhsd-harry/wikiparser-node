import {nodeLike} from '../mixin/nodeLike';
import {elementLike} from '../mixin/elementLike';
import type {NodeLike} from '../mixin/nodeLike';
import type {ElementLike} from '../mixin/elementLike';
import type {AstNodes, Token} from '../internal';

export interface AstRange extends NodeLike, ElementLike {}

export const cannotSetRange = 'The start and end positions are not siblings!';

/**
 * 获取父节点或抛出错误
 * @param node 参考节点
 * @throws `RangeError` 参考节点没有父节点
 */
const getParent = (node: AstNodes): Token => {
	const {parentNode} = node;
	return parentNode!;
};

/**
 * Range-like
 *
 * 模拟Range对象
 */
@nodeLike @elementLike
export class AstRange {
	#startContainer: AstNodes | undefined;
	#startOffset: number | undefined;
	#endContainer: AstNodes | undefined;
	#endOffset: number | undefined;

	/** start container / 起点容器 */
	get startContainer(): AstNodes {
		return this.#startContainer!;
	}

	/** start offset / 起点位置 */
	get startOffset(): number {
		return this.#startOffset!;
	}

	/** end container / 终点容器 */
	get endContainer(): AstNodes {
		return this.#endContainer!;
	}

	/** end offset / 终点位置 */
	get endOffset(): number {
		return this.#endOffset!;
	}

	/** closest common ancestor / 最近的公共祖先 */
	get commonAncestorContainer(): AstNodes {
		const {startContainer} = this;
		return startContainer;
	}

	/**
	 * nodes in the Range
	 *
	 * 范围内的节点
	 * @since v1.23.0
	 */
	// eslint-disable-next-line @typescript-eslint/class-methods-use-this
	get childNodes(): AstNodes[] {
		return [];
	}

	/** @private */
	// eslint-disable-next-line @typescript-eslint/class-methods-use-this
	get parentNode(): Token | undefined {
		return undefined;
	}

	/**
	 * Set the start
	 *
	 * 设置起点
	 * @param startNode start container / 起点容器
	 * @param offset start offset / 起点位置
	 * @throws `RangeError` if the offset is out of range or the start container is invalid
	 */
	setStart(startNode: AstNodes, offset: number): void {
		this.#startContainer = startNode;
		this.#startOffset = offset;
	}

	/**
	 * Set the end
	 *
	 * 设置终点
	 * @param endNode end container / 终点容器
	 * @param offset end offset / 终点位置
	 * @throws `RangeError` if the offset is out of range or the end container is invalid
	 */
	setEnd(endNode: AstNodes, offset: number): void {
		this.#endContainer = endNode;
		this.#endOffset = offset;
	}

	/**
	 * 在节点后设置
	 * @param method 方法名
	 * @param referenceNode 节点
	 */
	#setAfter(method: 'setStart' | 'setEnd', referenceNode: AstNodes): void {
		const parentNode = getParent(referenceNode);
		this[method](parentNode, parentNode.childNodes.indexOf(referenceNode) + 1);
	}

	/**
	 * Set the start after the node
	 *
	 * 在节点后设置起点
	 * @param referenceNode reference node / 节点
	 * @throws `RangeError` if the node has no parent
	 */
	setStartAfter(referenceNode: AstNodes): void {
		this.#setAfter('setStart', referenceNode);
	}

	/**
	 * 在节点前设置
	 * @param method 方法名
	 * @param referenceNode 节点
	 */
	#setBefore(method: 'setStart' | 'setEnd', referenceNode: AstNodes): void {
		const parentNode = getParent(referenceNode);
		this[method](parentNode, parentNode.childNodes.indexOf(referenceNode));
	}

	/**
	 * Set the end before the node
	 *
	 * 在节点前设置终点
	 * @param referenceNode reference node / 节点
	 * @throws `RangeError` if the node has no parent
	 */
	setEndBefore(referenceNode: AstNodes): void {
		this.#setBefore('setEnd', referenceNode);
	}

	/**
	 * Get the contents of the Range
	 *
	 * 获取范围内的全部节点
	 */
	extractContents(): AstNodes[] {
		if (this.startContainer === this.endContainer && this.#startOffset === this.#endOffset) {
			return [];
		}
		const {startContainer, startOffset, endContainer, endOffset, commonAncestorContainer} = this,
			{childNodes} = commonAncestorContainer;
		const from = startContainer.type === 'text' ? childNodes.indexOf(startContainer) : startOffset,
			to = endContainer.type === 'text' ? childNodes.indexOf(endContainer) + 1 : endOffset;
		return childNodes.slice(from, to);
	}

	/**
	 * Clone the contents of the Range
	 *
	 * 拷贝范围内的全部节点
	 */
	cloneContents(): AstNodes[] {
		return this.extractContents().map(node => node.cloneNode());
	}
}
