import {Shadow} from '../../util/debug';
import {hidden} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
// @ts-expect-error not implementing all abstract methods
export class NoincludeToken extends hidden(NowikiBaseToken) {
	override readonly type = 'noinclude';

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param str 新文本
	 * @throws `Error` 不可更改
	 */
	override setText(str: string): string {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s[^>]*)?\/?>$/iu.test(this.innerText)) {
			throw new Error(`${this.constructor.name} 不可更改文字内容！`);
		}
		return super.setText(str);
	}
}

Shadow.classes['NoincludeToken'] = __filename;
