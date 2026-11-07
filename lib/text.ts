import {
	removeComment,

	/* NOT FOR BROWSER */

	sanitize,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';

/* NOT FOR BROWSER */

import {readOnly} from '../mixin/readOnly';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

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
		if (skip && !this.parentNode?.getAttribute('built')) { // eslint-disable-line unicorn/prefer-ternary
			return removeComment(this.data);
		}
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
	@readOnly()
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
	 * Split the text node into two parts
	 *
	 * 将文本子节点分裂为两部分
	 * @param offset position to be splitted at / 分裂位置
	 * @throws `RangeError` if the offset is out of range
	 * @throws `Error` if the text node has no parent node
	 */
	splitText(offset: number): AstText {
		LSP: {
			const {parentNode, data} = this;
			const newText = new AstText(data.slice(offset));
			setChildNodes(parentNode!, parentNode!.childNodes.indexOf(this) + 1, 0, [newText]);
			this.setAttribute('data', data.slice(0, offset));
			return newText;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * Clone the node
	 *
	 * 复制
	 */
	cloneNode(): AstText {
		return new AstText(this.data);
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

	/**
	 * Insert text
	 *
	 * 插入字符串
	 * @param offset position to be inserted at / 插入位置
	 * @param text text to be inserted / 待插入的字符串
	 */
	insertData(offset: number, text: string): void {
		this.#setData(this.data.slice(0, offset) + text + this.data.slice(offset));
	}

	/**
	 * Extract plain text
	 *
	 * 提取纯文本
	 * @param nowrap whether to disable line-wrapping / 是否不换行
	 * @since v2.0.0
	 */
	plainText(nowrap?: boolean): string {
		const {data} = this;
		return nowrap ? data.replaceAll('\n', ' ') : data;
	}

	/** @private */
	removeBlankLines(): void {
		if (/\s$/u.test(this.data)) {
			const spaces: AstText[] = [],
				index = this.data.search(/\n[^\S\n]*$/u);
			let {nextSibling} = this,
				mt2: RegExpExecArray | null | false = null,
				hasCommentOrCat = false;
			while (
				nextSibling
				&& (nextSibling.is('comment') || nextSibling.is('category') || nextSibling.type === 'text')
			) {
				if (nextSibling.type === 'text') {
					mt2 = index !== -1 && /^[^\S\n]*(?=\n)/u.exec(nextSibling.data);
					if (mt2 || nextSibling.data.trim()) {
						break;
					} else {
						spaces.push(nextSibling);
					}
				} else {
					hasCommentOrCat = true;
				}
				if (index !== -1 && nextSibling.is('category')) {
					const trimmed = this.data.trimEnd();
					if (this.data !== trimmed) {
						const {length} = trimmed;
						this.deleteData(length + this.data.slice(length).indexOf('\n'));
					}
					for (const space of spaces) {
						space.#setData('');
					}
					spaces.length = 0;
				}
				({nextSibling} = nextSibling);
			}
			if (hasCommentOrCat && mt2 || nextSibling?.is('table')) {
				if (index === -1) {
					this.#setData(this.data.trimEnd());
				} else {
					this.deleteData(index + (mt2 ? 0 : 1));
					if (mt2) {
						(nextSibling as AstText).deleteData(0, mt2[0].length);
					}
				}
				for (const space of spaces) {
					space.#setData('');
				}
			}
		}
	}

	/** @private */
	@cached()
	toHtmlInternal(opt?: PlainOpt): string {
		return sanitize(this.plainTextInternal(opt));
	}

	/** @private */
	@cached()
	plainTextInternal(opt?: PlainOpt): string {
		this.removeBlankLines();
		return this.plainText(opt?.nowrap);
	}
}
