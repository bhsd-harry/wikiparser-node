import * as Parser from '../index';
import type {AstNodes, Token} from '../internal';
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
	#startContainer?: AstNodes;
	#startOffset?: number;
	#endContainer?: AstNodes;
	#endOffset?: number;

	/**
	 * 未初始化时抛出错误
	 * @param start 是否未初始化起点
	 * @throws `Error` 未初始化
	 */
	// eslint-disable-next-line class-methods-use-this
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
		return this.startIndex === this.endIndex;
	}

	/** 最近的公共祖先 */
	get commonAncestorContainer(): AstNodes {
		const {startContainer, endContainer} = this;
		let parentNode: AstNodes | undefined = startContainer;
		while (!parentNode!.contains(endContainer)) {
			({parentNode} = parentNode!);
		}
		return parentNode!;
	}

	/**
	 * 设置起点
	 * @param startNode 起点容器
	 * @param startOffset 起点位置
	 * @throws `RangeError` 不在同一个文档
	 * @throws `RangeError` offset取值超出范围
	 */
	setStart(startNode: AstNodes, startOffset: number): void {
		const root = this.#endContainer?.getRootNode(),
			{length} = startNode;
		if (root && root !== startNode.getRootNode()) {
			throw new RangeError('起点不在同一个文档中！');
		} else if (startOffset < 0 || startOffset > length) {
			throw new RangeError(`offset取值范围应为 0 ~ ${length}`);
		} else if (root && getIndex(startNode, startOffset) > this.endIndex) {
			throw new RangeError('起点不能位于终点之后！');
		}
		this.#startContainer = startNode;
		this.#startOffset = startOffset;
	}

	/**
	 * 设置终点
	 * @param endNode 终点容器
	 * @param endOffset 终点位置
	 * @throws `RangeError` 不在同一个文档
	 * @throws `RangeError` offset取值超出范围
	 */
	setEnd(endNode: AstNodes, endOffset: number): void {
		const root = this.#startContainer?.getRootNode(),
			{length} = endNode;
		if (root && root !== endNode.getRootNode()) {
			throw new RangeError('终点不在同一个文档中！');
		} else if (endOffset < 0 || endOffset > length) {
			throw new RangeError(`offset取值范围应为 0 ~ ${length}`);
		} else if (root && getIndex(endNode, endOffset) < this.startIndex) {
			throw new RangeError('终点不能位于起点之前！');
		}
		this.#endContainer = endNode;
		this.#endOffset = endOffset;
	}

	/**
	 * 在节点后设置
	 * @param method 方法名
	 * @param referenceNode 节点
	 */
	#setAfter(method: 'setStart' | 'setEnd', referenceNode: AstNodes): void {
		if (referenceNode.type === 'root') {
			this[method](referenceNode, referenceNode.length);
		} else {
			const {parentNode} = referenceNode;
			this[method](parentNode!, parentNode!.childNodes.indexOf(referenceNode) + 1);
		}
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
		if (referenceNode.type === 'root') {
			this[method](referenceNode, 0);
		} else {
			const {parentNode} = referenceNode;
			this[method](parentNode!, parentNode!.childNodes.indexOf(referenceNode));
		}
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
	 * 根据字符位置设置
	 * @param method 方法名
	 * @param root 根节点
	 * @param index 字符位置
	 * @throws `RangeError` 超出有效范围
	 */
	#setIndex(method: 'setStart' | 'setEnd', root: Token, index?: number): void {
		const caretPosition = root.caretPositionFromIndex(index);
		if (caretPosition === undefined) {
			throw new RangeError('字符坐标超出有效的范围！');
		}
		const {offsetNode, offset} = caretPosition;
		if (offsetNode.type === 'text') {
			this[method](offsetNode, offset);
		} else {
			const i = offsetNode.childNodes.findIndex(child => child.getRelativeIndex() >= offset);
			this[method](offsetNode, i === -1 ? offsetNode.length : i);
		}
	}

	/**
	 * 根据字符位置设置起点
	 * @param root 根节点
	 * @param index 字符位置
	 */
	setStartIndex(root: Token, index: number): void {
		this.#setIndex('setStart', root, index);
	}

	/**
	 * 根据字符位置设置终点
	 * @param root 根节点
	 * @param index 字符位置
	 */
	setEndIndex(root: Token, index: number): void {
		this.#setIndex('setEnd', root, index);
	}

	/**
	 * 根据行列号设置
	 * @param method 方法名
	 * @param root 根节点
	 * @param x 列
	 * @param y 行
	 */
	#setPoint(method: 'setStart' | 'setEnd', root: Token, x: number, y: number): void {
		this.#setIndex(method, root, root.indexFromPos(y, x));
	}

	/**
	 * 根据行列号设置起点
	 * @param root 根节点
	 * @param x 列
	 * @param y 行
	 */
	setStartPoint(root: Token, x: number, y: number): void {
		this.#setPoint('setStart', root, x, y);
	}

	/**
	 * 根据行列号设置终点
	 * @param root 根节点
	 * @param x 列
	 * @param y 行
	 */
	setEndPoint(root: Token, x: number, y: number): void {
		this.#setPoint('setEnd', root, x, y);
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
		if (referenceNode.type === 'root') {
			this.selectNodeContents(referenceNode);
		} else {
			const {parentNode} = referenceNode,
				i = parentNode!.childNodes.indexOf(referenceNode);
			this.#startContainer = parentNode!;
			this.#startOffset = i;
			this.#endContainer = parentNode!;
			this.#endOffset = i + 1;
		}
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
		const {startContainer, startIndex, endIndex} = this;
		if (startContainer.getRootNode() !== referenceNode.getRootNode()) {
			throw new RangeError('待比较的端点不在同一个文档中！');
		}
		const index = getIndex(referenceNode, offset);
		if (index < startIndex) {
			return -1;
		}
		return index > endIndex ? 1 : 0;
	}

	/**
	 * 端点是否在Range中
	 * @param referenceNode 端点容器
	 * @param offset 端点位置
	 * @throws `RangeError` 不在同一个文档
	 */
	isPointInRange(referenceNode: AstNodes, offset: number): boolean {
		return this.comparePoint(referenceNode, offset) === 0;
	}

	/**
	 * 是否与节点相交
	 * @param referenceNode 节点
	 * @throws `RangeError` 不在同一个文档
	 */
	intersectsNode(referenceNode: AstNodes): boolean {
		const {startContainer, startIndex, endIndex} = this;
		if (startContainer.getRootNode() !== referenceNode.getRootNode()) {
			throw new RangeError('待比较的端点不在同一个文档中！');
		}
		const index = referenceNode.getAbsoluteIndex();
		return index < endIndex && index + String(referenceNode).length > startIndex;
	}

	/** 复制 */
	cloneRange(): AstRange {
		const range = new AstRange();
		range.setStart(this.startContainer, this.startOffset);
		range.setEnd(this.endContainer, this.endOffset);
		return range;
	}

	/** 删除 */
	deleteContents(): void {
		const {startContainer, startOffset} = this;
		let {endContainer, endOffset} = this,
			parentNode: Token | undefined;
		while (!endContainer.contains(startContainer)) {
			({parentNode} = endContainer);
			if (endContainer.type === 'text') {
				endContainer.deleteData(0, endOffset);
			} else {
				for (let i = endOffset - 1; i >= 0; i--) {
					endContainer.removeAt(i);
				}
			}
			endOffset = parentNode!.childNodes.indexOf(endContainer);
			endContainer = parentNode!;
		}
		while (endContainer !== startContainer) {
			const {childNodes} = endContainer,
				j = childNodes.findIndex(child => child.contains(startContainer));
			for (let i = endOffset - 1; i > j; i--) {
				(endContainer as Token).removeAt(i);
			}
			endContainer = childNodes[j]!;
			endOffset = endContainer.length;
		}
		if (endContainer.type === 'text') {
			endContainer.deleteData(startOffset, endOffset);
		} else {
			for (let i = endOffset - 1; i >= startOffset; i--) {
				endContainer.removeAt(i);
			}
		}
		this.#endContainer = endContainer;
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
	insertNode(newNode: AstNodes): void {
		const {startContainer, startOffset} = this;
		if (startContainer.type === 'text') {
			startContainer.splitText(startOffset);
			startContainer.after(newNode);
		} else {
			startContainer.insertAt(newNode, startOffset);
		}
	}

	/** @private */
	toString(): string {
		return String(this.startContainer.getRootNode()).slice(this.startIndex, this.endIndex);
	}

	/**
	 * 在满足条件时获取范围内的全部节点
	 * @throws `Error` 不是某个节点的连续子节点
	 */
	extractContents(): AstNodes[] {
		if (this.collapsed) {
			return [];
		}
		const {startContainer, endContainer, commonAncestorContainer} = this;
		if (commonAncestorContainer.type === 'text') {
			commonAncestorContainer.splitText(this.endOffset);
			commonAncestorContainer.splitText(this.startOffset);
			return [commonAncestorContainer.nextSibling!];
		} else if (startContainer !== commonAncestorContainer
			&& (startContainer.type !== 'text' || startContainer.parentNode !== commonAncestorContainer)
			|| endContainer !== commonAncestorContainer
			&& (endContainer.type !== 'text' || endContainer.parentNode !== commonAncestorContainer)
		) {
			throw new Error('extractContents 方法只能用于获取某个节点的连续子节点！');
		}
		let {startOffset, endOffset} = this;
		if (startContainer.type === 'text' && startContainer.parentNode === commonAncestorContainer) {
			startContainer.splitText(this.startOffset);
			startOffset = commonAncestorContainer.childNodes.indexOf(startContainer) + 1;
		}
		if (endContainer.type === 'text' && endContainer.parentNode === commonAncestorContainer) {
			endContainer.splitText(this.endOffset);
			endOffset = commonAncestorContainer.childNodes.indexOf(endContainer);
		}
		return commonAncestorContainer.childNodes.slice(startOffset, endOffset);
	}
}

Parser.classes['AstRange'] = __filename;
