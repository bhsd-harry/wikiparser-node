import {
	removeComment,
} from '../util/string';
import {AstNode} from './node';

/**
 * text node
 *
 * 文本节点
 */
export class AstText extends AstNode {
	declare readonly name: undefined;
	override readonly data: string = '';

	override get type(): 'text' {
		return 'text';
	}

	/** @param text 包含文本 */
	constructor(text: string) {
		super();
		this.data = text;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip && !this.parentNode?.getAttribute('built') ? removeComment(this.data) : this.data;
	}

	/** @private */
	text(): string {
		return this.data;
	}

	/**
	 * 修改内容
	 * @param text 新内容
	 */
	#setData(text: string): void {
		this.setAttribute('data', text);
	}

	/**
	 * Replace the text
	 *
	 * 替换字符串
	 * @param text new text / 替换的字符串
	 */
	replaceData(text: string): void {
		this.#setData(text);
	}
}
