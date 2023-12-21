import {classes} from '../util/constants';
import type {AstNodes} from '../internal';
import type {Dimension, Position} from './node';

/**
 * 计算绝对位置
 * @param referenceNode 容器
 * @param offset 相对位置
 */
const getIndex = (referenceNode: AstNodes, offset: number): number =>
	referenceNode.getAbsoluteIndex() + referenceNode.getRelativeIndex(offset);

/** 模拟Range对象 */
export class AstRange {
	#startContainer: AstNodes | undefined;
	#startOffset: number | undefined;
	#endContainer: AstNodes | undefined;
	#endOffset: number | undefined;

	/**
	 * 未初始化时抛出错误
	 * @param start 是否未初始化起点
	 * @throws `Error` 未初始化
	 */
	#notInit(start: boolean): never {
		throw new Error(`请先指定${start ? '起始' : '终止'}位置！`);
	}

	/** 起点容器 */
	get startContainer(): AstNodes {
		return this.#startContainer ?? this.#notInit(true);
	}

	/** 起点位置 */
	get startOffset(): number {
		return this.#startOffset ?? this.#notInit(true);
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
		return this.#endContainer ?? this.#notInit(false);
	}

	/** 终点位置 */
	get endOffset(): number {
		return this.#endOffset ?? this.#notInit(false);
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
		const {startContainer, startOffset, endContainer, endOffset} = this;
		if (startContainer === endContainer) {
			if (startOffset > endOffset) {
				throw new RangeError('起点不能位于终点之后！');
			}
			return;
		}
		const {type: startType, parentNode: startParent} = startContainer,
			{type: endType, parentNode: endParent} = endContainer;
		if (startType !== 'text') {
			if (endType !== 'text' || startContainer !== endParent) {
				throw new RangeError('起点和终点不是兄弟节点！');
			} else if (startOffset > endParent.childNodes.indexOf(endContainer)) {
				throw new RangeError('起点不能位于终点之后！');
			}
		} else if (endType === 'text') {
			if (!startParent || startParent !== endParent) {
				throw new RangeError('起点和终点不是兄弟节点！');
			}
			const {childNodes} = startParent;
			if (childNodes.indexOf(startContainer) > childNodes.indexOf(endContainer)) {
				throw new RangeError('起点不能位于终点之后！');
			}
		} else if (startParent !== endContainer) {
			throw new RangeError('起点和终点不是兄弟节点！');
		} else if (endOffset <= startParent.childNodes.indexOf(startContainer)) {
			throw new RangeError('起点不能位于终点之后！');
		}
	}

	/**
	 * 设置起点
	 * @param startNode 起点容器
	 * @param startOffset 起点位置
	 * @throws `RangeError` offset取值超出范围
	 */
	setStart(startNode: AstNodes, startOffset: number): void {
		const {length} = startNode;
		if (startOffset < 0 || startOffset > length) {
			throw new RangeError(`offset取值范围应为 0 ~ ${length}`);
		}
		this.#startContainer = startNode;
		this.#startOffset = startOffset;
		if (this.#endContainer) {
			try {
				this.#check();
			} catch (e) {
				this.#startContainer = undefined;
				this.#startOffset = undefined;
				throw e;
			}
		}
	}

	/**
	 * 设置终点
	 * @param endNode 终点容器
	 * @param endOffset 终点位置
	 * @throws `RangeError` offset取值超出范围
	 */
	setEnd(endNode: AstNodes, endOffset: number): void {
		const {length} = endNode;
		if (endOffset < 0 || endOffset > length) {
			throw new RangeError(`offset取值范围应为 0 ~ ${length}`);
		}
		this.#endContainer = endNode;
		this.#endOffset = endOffset;
		if (this.#startContainer) {
			try {
				this.#check();
			} catch (e) {
				this.#endContainer = undefined;
				this.#endOffset = undefined;
				throw e;
			}
		}
	}

	/**
	 * 在节点后设置
	 * @param method 方法名
	 * @param referenceNode 节点
	 * @throws `RangeError` 参考节点没有父节点
	 */
	#setAfter(method: 'setStart' | 'setEnd', referenceNode: AstNodes): void {
		const {parentNode} = referenceNode;
		if (!parentNode) {
			throw new RangeError('参考节点没有父节点！');
		}
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
	 * @throws `RangeError` 参考节点没有父节点
	 */
	#setBefore(method: 'setStart' | 'setEnd', referenceNode: AstNodes): void {
		const {parentNode} = referenceNode;
		if (!parentNode) {
			throw new RangeError('参考节点没有父节点！');
		}
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
	 * @throws `RangeError` 参考节点没有父节点
	 */
	selectNode(referenceNode: AstNodes): void {
		const {parentNode} = referenceNode;
		if (!parentNode) {
			throw new RangeError('参考节点没有父节点！');
		}
		const i = parentNode.childNodes.indexOf(referenceNode);
		this.#startContainer = parentNode;
		this.#startOffset = i;
		this.#endContainer = parentNode;
		this.#endOffset = i + 1;
	}

	/**
	 * 使起始和终止位置重合
	 * @param toStart 重合至起始位置
	 */
	collapse(toStart = false): void {
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
			throw new RangeError('待比较的端点不在同一个文档中！');
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

	/** 删除Range中的内容 */
	deleteContents(): void {
		const {startContainer, endContainer, commonAncestorContainer} = this,
			{childNodes} = commonAncestorContainer;
		let {startOffset, endOffset} = this;
		if (commonAncestorContainer.type === 'text') {
			commonAncestorContainer.deleteData(startOffset, endOffset);
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
				} else if (endContainer && endContainer.type !== 'text') {
					this.#endOffset! += 2;
				}
			} else {
				startContainer.before(newNode);
				if (endContainer && endContainer.type !== 'text') {
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
		return String(startContainer.getRootNode()).slice(startIndex, endIndex);
	}

	/** 获取范围内的全部节点 */
	extractContents(): AstNodes[] {
		const {startContainer, startOffset, endContainer, endOffset, commonAncestorContainer} = this,
			{childNodes} = commonAncestorContainer;
		if (commonAncestorContainer.type === 'text') {
			if (startOffset === endOffset) {
				return [];
			}
			commonAncestorContainer.splitText(endOffset);
			const nextSibling = commonAncestorContainer.splitText(startOffset);
			this.#startContainer = nextSibling;
			this.#startOffset = 0;
			this.#endContainer = nextSibling;
			this.#endOffset! -= startOffset;
			return [nextSibling];
		} else if (endContainer.type === 'text') {
			if (endOffset && endOffset < endContainer.length) {
				endContainer.splitText(endOffset);
			}
			this.#endContainer = commonAncestorContainer;
			this.#endOffset = childNodes.indexOf(endContainer) + (endOffset && 1);
		}
		if (startContainer.type === 'text') {
			if (startOffset && startOffset < startContainer.length) {
				startContainer.splitText(startOffset);
				this.#endOffset!++;
			}
			this.#startContainer = commonAncestorContainer;
			this.#startOffset = childNodes.indexOf(startContainer) + (startOffset && 1);
		}
		return commonAncestorContainer.childNodes.slice(this.#startOffset, this.#endOffset);
	}

	/** 在满足条件时拷贝范围内的全部节点 */
	cloneContents(): AstNodes[] {
		return this.extractContents().map(node => node.cloneNode());
	}
}

classes['AstRange'] = __filename;
