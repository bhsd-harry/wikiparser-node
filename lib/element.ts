import {
	text,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {getCondition} from '../parser/selector';
import {AstNode} from './node';
import {elementLike} from '../mixin/elementLike';
import type {
	LintError,
} from '../base';
import type {ElementLike} from '../mixin/elementLike';
import type {
	AstNodes,
	AstText,
	Token,
} from '../internal';

export interface CaretPosition {
	readonly offsetNode: AstNodes;
	readonly offset: number;
}

export interface AstElement extends AstNode, ElementLike {}

/**
 * HTMLElement-like
 *
 * 类似HTMLElement
 */
@elementLike
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** number of child nodes / 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/** @private */
	text(separator?: string): string {
		return text(this.childNodes, separator);
	}

	/**
	 * Merge adjacent text child nodes
	 *
	 * 合并相邻的文本子节点
	 */
	normalize(): void {
		const childNodes = this.getChildNodes();

		/**
		 * 移除子节点
		 * @param i 移除位置
		 */
		const remove = (i: number): void => {
			childNodes.splice(i, 1);
			childNodes[i - 1]?.setAttribute('nextSibling', childNodes[i]);
			childNodes[i]?.setAttribute('previousSibling', childNodes[i - 1]);
		};
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!;
			if (type !== 'text' || childNodes.length === 1 || this.getGaps(i - (i && 1))) {
				//
			} else if (data === '') {
				remove(i);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * Remove a child node
	 *
	 * 移除子节点
	 * @param i position of the child node / 移除位置
	 */
	removeAt(i: number): AstNodes {
		// eslint-disable-next-line no-unused-labels
		LSP: return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * Insert a child node
	 *
	 * 插入子节点
	 * @param node node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * Get the closest ancestor node that matches the selector
	 *
	 * 最近的符合选择器的祖先节点
	 * @param selector selector / 选择器
	 */
	closest<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector, this);
		let {parentNode} = this;
		while (parentNode) {
			if (condition(parentNode)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * Insert a batch of child nodes at the end
	 *
	 * 在末尾批量插入子节点
	 * @param elements nodes to be inserted / 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		this.safeAppend(elements);
	}

	/** @private */
	safeAppend(elements: readonly (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/** @private */
	safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		LSP: { // eslint-disable-line no-unused-labels
			for (let i = this.length - 1; i >= 0; i--) {
				this.removeAt(i);
			}
			this.safeAppend(elements);
		}
	}

	/**
	 * Modify the text child node
	 *
	 * 修改文本子节点
	 * @param str new text / 新文本
	 * @param i position of the text child node / 子节点位置
	 */
	setText(str: string, i = 0): string {
		i += i < 0 ? this.length : 0;
		const oldText = this.childNodes[i] as AstText;
		const {data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/** @private */
	override toString(skip?: boolean, separator = ''): string {
		return this.childNodes.map(child => child.toString(skip)).join(separator);
	}

	/**
	 * Get the caret position from the character index
	 *
	 * 找到给定位置
	 * @param index character index / 位置
	 */
	caretPositionFromIndex(index?: number): CaretPosition | undefined {
		LSP: { // eslint-disable-line no-unused-labels
			if (index === undefined) {
				return undefined;
			}
			const {length} = this.toString();
			if (index > length || index < -length) {
				return undefined;
			}
			index += index < 0 ? length : 0;
			let self: AstNode = this,
				acc = 0,
				start = 0;
			while (self.type !== 'text') {
				const {childNodes} = self;
				acc += self.getAttribute('padding');
				for (let i = 0; acc <= index && i < childNodes.length; i++) {
					const cur: AstNodes = childNodes[i]!,
						{nextSibling} = cur,
						str = cur.toString(),
						l = str.length;
					cur.setAttribute('aIndex', acc);
					acc += l;
					// 优先选择靠前的非文本兄弟节点，但永不进入假节点
					if (
						acc > index
						|| acc === index && l > 0 && (
							!nextSibling
							|| nextSibling.type === 'text'
							|| cur.type !== 'text' && (str.trim() || !nextSibling.toString().trim())
						)
					) {
						self = cur;
						acc -= l;
						start = acc;
						break;
					}
					acc += self.getGaps(i);
				}
				if (self.childNodes === childNodes) {
					return {offsetNode: self as Token, offset: index - start};
				}
			}
			return {offsetNode: self as AstText, offset: index - start};
		}
	}

	/**
	 * Get the closest ancestor element from the character index
	 *
	 * 找到给定位置所在的最内层非文本节点
	 * @param index character index / 位置
	 */
	elementFromIndex(index?: number): Token | undefined {
		LSP: { // eslint-disable-line no-unused-labels
			const node = this.caretPositionFromIndex(index)?.offsetNode;
			return node?.type === 'text' ? node.parentNode : node;
		}
	}

	/**
	 * Get the closest ancestor element from the position
	 *
	 * 找到给定位置所在的最内层非文本节点
	 * @param x column number / 列数
	 * @param y line number / 行数
	 */
	elementFromPoint(x: number, y: number): Token | undefined {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.elementFromIndex(this.indexFromPos(y, x));
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!;
			child.setAttribute('aIndex', cur);
			const childErrors = child.lint(cur, re);
			if (childErrors.length > 0) {
				errors.push(...childErrors);
			}
			cur += child.toString().length + this.getGaps(i);
		}
		return errors;
	}
}
