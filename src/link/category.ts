import {decodeHtml} from '../../util/string';
import {classes} from '../../util/constants';
import {LinkBaseToken} from './base';

/** 分类 */
// @ts-expect-error not implementing all abstract methods
export class CategoryToken extends LinkBaseToken {
	override readonly type = 'category';

	/* NOT FOR BROWSER */

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

classes['CategoryToken'] = __filename;
