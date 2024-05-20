import type {LintError, AstNode as AstNodeBase, TokenTypes} from '../base';
import type {
	AstText,
	Token,
} from '../internal';

export type AstNodes = AstText | Token;
export interface Dimension {
	readonly height: number;
	readonly width: number;
}
export interface Position {
	readonly top: number;
	readonly left: number;
}
export interface CaretPosition {
	readonly offsetNode: AstNodes;
	readonly offset: number;
}

/**
 * 计算字符串的行列数
 * @param str 字符串
 */
const getDimension = (str: string): Dimension => {
	const lines = str.split('\n'),
		height = lines.length;
	return {height, width: lines[height - 1]!.length};
};

/**
 * 获取子节点相对于父节点的字符位置
 * @param j 子节点序号
 * @param parent 父节点
 */
const getIndex = (j: number, parent: AstNode): number =>
	parent.childNodes.slice(0, j).reduce((acc, cur, i) => acc + String(cur).length + parent.getGaps(i), 0)
	+ parent.getAttribute('padding');

/** 类似Node */
export abstract class AstNode implements AstNodeBase {
	declare type: TokenTypes | 'text';
	declare data?: string | undefined;
	readonly childNodes: readonly AstNodes[] = [];
	#parentNode: Token | undefined;

	abstract lint(): LintError[];
	abstract print(): string;

	/** 首位子节点 */
	get firstChild(): AstNodes | undefined {
		return this.childNodes[0];
	}

	/** 末位子节点 */
	get lastChild(): AstNodes | undefined {
		return this.childNodes[this.childNodes.length - 1];
	}

	/** 父节点 */
	get parentNode(): Token | undefined {
		return this.#parentNode;
	}

	/** 后一个兄弟节点 */
	get nextSibling(): AstNodes | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this as AstNode as AstNodes) + 1];
	}

	/** 前一个兄弟节点 */
	get previousSibling(): AstNodes | undefined {
		const childNodes = this.parentNode?.childNodes;
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
		return this[key as keyof this] as TokenAttributeGetter<T>;
	}

	/** @private */
	setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
		if (key === 'parentNode') {
			this.#parentNode = value as TokenAttributeSetter<'parentNode'>;
		} else {
			this[key as keyof this] = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
			const {height, width} = getDimension(str.slice(0, index));
			return {top: height - 1, left: width};
		}
		return undefined;
	}

	/** 获取行数和最后一行的列数 */
	#getDimension(): Dimension {
		return getDimension(String(this));
	}

	/** @private */
	getGaps(i: number): number {
		return 0;
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j 子节点序号
	 */
	getRelativeIndex(j?: number): number {
		if (j === undefined) {
			const {parentNode} = this;
			return parentNode ? getIndex(parentNode.childNodes.indexOf(this as AstNode as AstNodes), parentNode) : 0;
		}
		return getIndex(j, this);
	}

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/** @private */
	seal(key: string, permanent?: boolean): void {
		Object.defineProperty(this, key, {
			enumerable: !permanent && Boolean(this[key as keyof this]),
			configurable: true,
		});
	}
}
