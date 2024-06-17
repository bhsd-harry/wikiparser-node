import {classes} from '../util/constants';
import type {AstNodes, Token} from '../internal';
import type {Dimension, Position} from './node';

/**
 * 计算绝对位置
 * @param referenceNode 容器
 * @param offset 相对位置
 */
const getIndex = (referenceNode: AstNodes, offset: number): number =>
	referenceNode.getAbsoluteIndex() + referenceNode.getRelativeIndex(offset);

/**
 * 获取父节点或抛出错误
 * @param node 参考节点
 * @throws `RangeError` 参考节点没有父节点
 */
const getParent = (node: AstNodes): Token => {
	const {parentNode} = node;
	if (parentNode) {
		return parentNode;
	}
	throw new RangeError('The reference node has no parent node!');
};

/**
 * 未初始化时抛出错误
 * @param start 是否未初始化起点
 * @throws `Error` 未初始化
 */
const notInit = (start: boolean): never => {
	throw new Error(`Please set the ${start ? 'start' : 'end'} position first!`);
};

/** 模拟Range对象 */
export class AstRange {
	#startContainer: AstNodes | undefined;
	#startOffset: number | undefined;
	#endContainer: AstNodes | undefined;
	#endOffset: number | undefined;

	/** 起点容器 */
	get startContainer(): AstNodes {
		return this.#startContainer ?? notInit(true);
	}

	/** 起点位置 */
	get startOffset(): number {
		return this.#startOffset ?? notInit(true);
	}

	/** 起点绝对位置 */
	get startIndex(): number {
		return getIndex(this.startContainer, this.startOffset);
	}

	/** 起点行列位置 */
	get startPos(): Position {
		return this.startContainer.getRootNode().posFromIndex(this.startIndex)!;
	}

	/** 终点容器 */
	get endContainer(): AstNodes {
		return this.#endContainer ?? notInit(false);
	}

	/** 终点位置 */
	get endOffset(): number {
		return this.#endOffset ?? notInit(false);
	}

	/** 终点绝对位置 */
	get endIndex(): number {
		return getIndex(this.endContainer, this.endOffset);
	}

	/** 终点行列位置 */
	get endPos(): Position {
		return this.endContainer.getRootNode().posFromIndex(this.endIndex)!;
	}

	/** 起始和终止位置是否重合 */
	get collapsed(): boolean {
		return this.startContainer === this.endContainer && this.startOffset === this.endOffset;
	}

	/** 最近的公共祖先 */
	get commonAncestorContainer(): AstNodes {
		const {startContainer, endContainer} = this;
		return startContainer.contains(endContainer) ? startContainer : startContainer.parentNode!;
	}

	/**
	 * 检查起点和终点的设置是否有效
	 * @throws `RangeError` 起点和终点不是兄弟节点
	 * @throws `RangeError` 起点位于终点之后
	 */
	#check(): void {
		const {startContainer, startOffset, endContainer, endOffset} = this,
			msg1 = 'The start and end positions are not siblings!',
			msg2 = 'The start position cannot be after the end position!';
		if (startContainer === endContainer) {
			if (startOffset > endOffset) {
				throw new RangeError(msg2);
			}
			return;
		}
		const {type: startType, parentNode: startParent} = startContainer,
			{type: endType, parentNode: endParent} = endContainer;
		if (startType !== 'text') {
			if (endType !== 'text' || startContainer !== endParent) {
				throw new RangeError(msg1);
			} else if (startOffset > endParent.childNodes.indexOf(endContainer)) {
				throw new RangeError(msg2);
			}
		} else if (endType === 'text') {
			if (!startParent || startParent !== endParent) {
				throw new RangeError(msg1);
			}
			const {childNodes} = startParent;
			if (childNodes.indexOf(startContainer) > childNodes.indexOf(endContainer)) {
				throw new RangeError(msg2);
			}
		} else if (startParent !== endContainer) {
			throw new RangeError(msg1);
		} else if (endOffset <= startParent.childNodes.indexOf(startContainer)) {
			throw new RangeError(msg2);
		}
	}

	/**
	 * 设置起点
	 * @param startNode 起点容器
	 * @param offset 起点位置
	 * @throws `RangeError` offset取值超出范围
	 */
	setStart(startNode: AstNodes, offset: number): void {
		const {length} = startNode;
		if (offset < 0 || offset > length) {
			throw new RangeError(`The range of startOffset should be 0 ~ ${length}`);
		}
		const startContainer = this.#startContainer,
			startOffset = this.#startOffset;
		this.#startContainer = startNode;
		this.#startOffset = offset;
		if (this.#endContainer) {
			try {
				this.#check();
			} catch (e) {
				this.#startContainer = startContainer;
				this.#startOffset = startOffset;
				throw e;
			}
		}
	}

	/**
	 * 设置终点
	 * @param endNode 终点容器
	 * @param offset 终点位置
	 * @throws `RangeError` offset取值超出范围
	 */
	setEnd(endNode: AstNodes, offset: number): void {
		const {length} = endNode;
		if (offset < 0 || offset > length) {
			throw new RangeError(`The range of endOffset should be 0 ~ ${length}`);
		}
		const endContainer = this.#endContainer,
			endOffset = this.#endOffset;
		this.#endContainer = endNode;
		this.#endOffset = offset;
		if (this.#startContainer) {
			try {
				this.#check();
			} catch (e) {
				this.#endContainer = endContainer;
				this.#endOffset = endOffset;
				throw e;
			}
		}
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
	 * 在节点后设置起点
	 * @param referenceNode 节点
	 */
	setStartAfter(referenceNode: AstNodes): void {
		this.#setAfter('setStart', referenceNode);
	}

	/**
	 * 在节点后设置终点
	 * @param referenceNode 节点
	 */
	setEndAfter(referenceNode: AstNodes): void {
		this.#setAfter('setEnd', referenceNode);
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
	 * 在节点前设置起点
	 * @param referenceNode 节点
	 */
	setStartBefore(referenceNode: AstNodes): void {
		this.#setBefore('setStart', referenceNode);
	}

	/**
	 * 在节点前设置终点
	 * @param referenceNode 节点
	 */
	setEndBefore(referenceNode: AstNodes): void {
		this.#setBefore('setEnd', referenceNode);
	}

	/**
	 * 设置Range包含整个节点的内容
	 * @param referenceNode 节点
	 */
	selectNodeContents(referenceNode: AstNodes): void {
		this.#startContainer = referenceNode;
		this.#startOffset = 0;
		this.#endContainer = referenceNode;
		this.#endOffset = referenceNode.length;
	}

	/**
	 * 设置Range包含整个节点
	 * @param referenceNode 节点
	 */
	selectNode(referenceNode: AstNodes): void {
		const parentNode = getParent(referenceNode),
			i = parentNode.childNodes.indexOf(referenceNode);
		this.#startContainer = parentNode;
		this.#startOffset = i;
		this.#endContainer = parentNode;
		this.#endOffset = i + 1;
	}

	/**
	 * 使起始和终止位置重合
	 * @param toStart 重合至起始位置
	 */
	collapse(toStart?: boolean): void {
		if (toStart) {
			this.#endContainer = this.startContainer;
			this.#endOffset = this.startOffset;
		} else {
			this.#startContainer = this.endContainer;
			this.#startOffset = this.endOffset;
		}
	}

	/**
	 * 比较端点和Range的位置
	 * @param referenceNode 端点容器
	 * @param offset 端点位置
	 * @throws `RangeError` 不在同一个文档
	 */
	comparePoint(referenceNode: AstNodes, offset: number): -1 | 0 | 1 {
		const {startContainer, startIndex, endContainer, endIndex} = this;
		if (startContainer.getRootNode() !== referenceNode.getRootNode()) {
			throw new RangeError('The point to be compared is not in the same document!');
		}
		const index = getIndex(referenceNode, offset);
		if (index < startIndex || index === startIndex && !startContainer.contains(referenceNode)) {
			return -1;
		}
		return index < endIndex || index === endIndex && endContainer.contains(referenceNode) ? 0 : 1;
	}

	/**
	 * 端点是否在Range中
	 * @param referenceNode 端点容器
	 * @param offset 端点位置
	 */
	isPointInRange(referenceNode: AstNodes, offset: number): boolean {
		return this.comparePoint(referenceNode, offset) === 0;
	}

	/** 复制AstRange对象 */
	cloneRange(): AstRange {
		const range = new AstRange();
		range.setStart(this.startContainer, this.startOffset);
		range.setEnd(this.endContainer, this.endOffset);
		return range;
	}

	/** 清空Range */
	detach(): void {
		this.#startContainer = undefined;
		this.#startOffset = undefined;
		this.#endContainer = undefined;
		this.#endOffset = undefined;
	}

	/** 删除Range中的内容 */
	deleteContents(): void {
		const {startContainer, endContainer, commonAncestorContainer} = this,
			{childNodes} = commonAncestorContainer;
		let {startOffset, endOffset} = this;
		if (commonAncestorContainer.type === 'text') {
			commonAncestorContainer.deleteData(startOffset, endOffset);
			this.#endOffset = this.#startOffset;
			return;
		} else if (startContainer.type === 'text') {
			startContainer.deleteData(startOffset, Infinity);
			startOffset = childNodes.indexOf(startContainer) + 1;
		}
		if (endContainer.type === 'text') {
			endContainer.deleteData(0, endOffset);
			endOffset = childNodes.indexOf(endContainer);
		}
		for (let i = endOffset - 1; i >= startOffset; i--) {
			commonAncestorContainer.removeAt(i);
		}
		this.#startContainer = commonAncestorContainer;
		this.#startOffset = startOffset;
		this.#endContainer = commonAncestorContainer;
		this.#endOffset = startOffset;
	}

	/** 获取行列位置和大小 */
	getBoundingClientRect(): Dimension & Position {
		const {startPos: {top, left}, endPos: {top: bottom, left: right}} = this;
		return {top, left, height: bottom - top + 1, width: bottom === top ? right - left : right};
	}

	/**
	 * 在起始位置插入节点
	 * @param newNode 插入的节点
	 */
	insertNode(newNode: AstNodes | string): void {
		const {startContainer, startOffset} = this,
			endContainer = this.#endContainer;
		if (startContainer.type === 'text') {
			if (startOffset) {
				startContainer.splitText(startOffset);
				this.#startContainer = startContainer.nextSibling!;
				this.#startOffset = 0;
				startContainer.after(newNode);
				if (endContainer === startContainer) {
					this.#endContainer = this.#startContainer;
					this.#endOffset! -= startOffset;
				} else if (endContainer) {
					this.#endOffset! += 2;
				}
			} else {
				startContainer.before(newNode);
				if (endContainer && endContainer !== startContainer) {
					this.#endOffset!++;
				}
			}
		} else {
			startContainer.insertAt(newNode as string, startOffset);
			this.#startOffset!++;
			if (endContainer === startContainer) {
				this.#endOffset!++;
			}
		}
	}

	/** @private */
	toString(): string {
		const {startContainer, startIndex, endIndex} = this;
		return startContainer.getRootNode().toString().slice(startIndex, endIndex);
	}

	/** 获取范围内的全部节点 */
	extractContents(): AstNodes[] {
		const {startContainer, startOffset, endContainer, endOffset, commonAncestorContainer} = this,
			{childNodes} = commonAncestorContainer;
		let from: number,
			to: number;
		if (commonAncestorContainer.type === 'text') {
			if (startOffset === endOffset) {
				return [];
			} else if (endOffset < commonAncestorContainer.length) {
				commonAncestorContainer.splitText(endOffset);
			}
			if (startOffset) {
				const nextSibling = commonAncestorContainer.splitText(startOffset);
				this.#startContainer = nextSibling;
				this.#startOffset = 0;
				this.#endContainer = nextSibling;
				this.#endOffset! -= startOffset;
				return [nextSibling];
			}
			return [commonAncestorContainer];
		} else if (endContainer.type === 'text') {
			if (endOffset && endOffset < endContainer.length) {
				endContainer.splitText(endOffset);
			}
			to = childNodes.indexOf(endContainer) + (endOffset && 1);
		} else {
			to = endOffset;
		}
		if (startContainer.type === 'text') {
			if (startOffset && startOffset < startContainer.length) {
				this.#startContainer = startContainer.splitText(startOffset);
				this.#startOffset = 0;
				this.#endOffset!++;
				to++;
			}
			from = childNodes.indexOf(startContainer) + (startOffset && 1);
		} else {
			from = startOffset;
		}
		return commonAncestorContainer.childNodes.slice(from, to);
	}

	/** 拷贝范围内的全部节点 */
	cloneContents(): AstNodes[] {
		return this.extractContents().map(node => node.cloneNode());
	}
}

classes['AstRange'] = __filename;
