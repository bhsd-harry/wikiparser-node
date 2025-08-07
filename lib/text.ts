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
		return this.data;
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

	/**
	 * Delete text
	 *
	 * 删减字符串
	 * @param offset start position / 起始位置
	 * @param count number of characters to be deleted / 删减字符数
	 */
	deleteData(offset: number, count = Infinity): void {
		this.#setData(
			this.data.slice(0, offset)
			+ (offset < 0 && offset + count >= 0 ? '' : this.data.slice(offset + count)),
		);
	}
}
