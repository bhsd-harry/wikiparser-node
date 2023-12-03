import type {AstText, Token} from '../internal';

export type AstNodes = AstText | Token;
export type TokenTypes = 'root'
	| 'plain'
	| 'onlyinclude'
	| 'noinclude'
	| 'include'
	| 'comment'
	| 'ext'
	| 'ext-attrs'
	| 'ext-attr-dirty'
	| 'ext-attr'
	| 'attr-key'
	| 'attr-value'
	| 'ext-inner'
	| 'arg'
	| 'arg-name'
	| 'arg-default'
	| 'hidden'
	| 'magic-word'
	| 'magic-word-name'
	| 'invoke-function'
	| 'invoke-module'
	| 'template'
	| 'template-name'
	| 'parameter'
	| 'parameter-key'
	| 'parameter-value'
	| 'heading'
	| 'heading-title'
	| 'heading-trail'
	| 'html'
	| 'html-attrs'
	| 'html-attr-dirty'
	| 'html-attr'
	| 'table'
	| 'tr'
	| 'td'
	| 'table-syntax'
	| 'table-attrs'
	| 'table-attr-dirty'
	| 'table-attr'
	| 'table-inter'
	| 'td-inner'
	| 'hr'
	| 'double-underscore'
	| 'link'
	| 'link-target'
	| 'link-text'
	| 'category'
	| 'file'
	| 'gallery-image'
	| 'imagemap-image'
	| 'image-parameter'
	| 'quote'
	| 'ext-link'
	| 'ext-link-text'
	| 'ext-link-url'
	| 'free-ext-link'
	| 'list'
	| 'dd'
	| 'converter'
	| 'converter-flags'
	| 'converter-flag'
	| 'converter-rule'
	| 'converter-rule-noconvert'
	| 'converter-rule-variant'
	| 'converter-rule-to'
	| 'converter-rule-from'
	| 'param-line'
	| 'imagemap-link';
export interface Dimension {
	height: number;
	width: number;
}
export interface Position {
	top: number;
	left: number;
}
export interface CaretPosition {
	offsetNode: AstNodes;
	offset: number;
}

/** 类似Node */
export abstract class AstNode {
	declare type: TokenTypes | 'text';
	declare data?: string | undefined;
	readonly childNodes: AstNodes[] = [];
	#parentNode: Token | undefined;

	/** 首位子节点 */
	get firstChild(): AstNodes | undefined {
		return this.childNodes[0];
	}

	/** 末位子节点 */
	get lastChild(): AstNodes | undefined {
		return this.childNodes.at(-1);
	}

	/** 父节点 */
	get parentNode(): Token | undefined {
		return this.#parentNode;
	}

	/** 后一个兄弟节点 */
	get nextSibling(): AstNodes | undefined {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this as AstNode as AstNodes) + 1];
	}

	/** 前一个兄弟节点 */
	get previousSibling(): AstNodes | undefined {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this as AstNode as AstNodes) - 1];
	}

	/** 行数 */
	get offsetHeight(): number {
		return this.#getDimension().height;
	}

	/** 最后一行的列数 */
	get offsetWidth(): number {
		return this.#getDimension().width;
	}

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'padding') {
			return 0 as TokenAttributeGetter<T>;
		}
		return key in this
			// @ts-expect-error noImplicitAny
			? String(this[key as string]) as TokenAttributeGetter<T>
			: undefined as TokenAttributeGetter<T>;
	}

	/** @private */
	setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
		if (key === 'parentNode') {
			this.#parentNode = value as TokenAttributeSetter<'parentNode'>;
		} else {
			// @ts-expect-error noImplicitAny
			this[key as string] = value;
		}
	}

	/** 获取根节点 */
	getRootNode(): Token | this {
		let {parentNode} = this;
		while (parentNode?.parentNode) {
			({parentNode} = parentNode);
		}
		return parentNode ?? this;
	}

	/**
	 * 将字符位置转换为行列号
	 * @param index 字符位置
	 */
	posFromIndex(index: number): Position | undefined {
		const str = String(this);
		if (index >= -str.length && index <= str.length) {
			const lines = str.slice(0, index).split('\n');
			return {
				top: lines.length - 1,
				left: lines.at(-1)!.length,
			};
		}
		return undefined;
	}

	/** 获取行数和最后一行的列数 */
	#getDimension(): Dimension {
		const lines = String(this).split('\n');
		return {
			height: lines.length,
			width: lines.at(-1)!.length,
		};
	}

	/** @private */
	protected getGaps(i: number): number {
		return 0;
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j 子节点序号
	 */
	getRelativeIndex(j?: number): number {
		let childNodes: AstNodes[];

		/**
		 * 获取子节点相对于父节点的字符位置，使用前需要先给`childNodes`赋值
		 * @param end 子节点序号
		 * @param parent 父节点
		 */
		const getIndex = (end: number, parent: AstNode): number =>
			childNodes.slice(0, end).reduce((acc, cur, i) => acc + String(cur).length + parent.getGaps(i), 0)
			+ parent.getAttribute('padding');
		if (j === undefined) {
			const {parentNode} = this;
			if (parentNode) {
				({childNodes} = parentNode);
				return getIndex(childNodes.indexOf(this as AstNode as AstNodes), parentNode);
			}
			return 0;
		}
		({childNodes} = this);
		return getIndex(j, this);
	}

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}
}
