import {decodeHtml} from '../../util/string';
import {Parser} from '../../index';
import {LinkToken} from '.';

/** 分类 */
export abstract class CategoryToken extends LinkToken {
	/** @browser */
	override readonly type = 'category';

	/** 分类排序关键字 */
	get sortkey(): string | undefined {
		const {childNodes: [, child]} = this;
		return child && decodeHtml(child.text());
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * 设置排序关键字
	 * @param text 排序关键字
	 */
	setSortkey(text?: string): void {
		this.setLinkText(text);
	}
}

Parser.classes['CategoryToken'] = __filename;
