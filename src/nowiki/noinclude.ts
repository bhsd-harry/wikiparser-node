import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
@hiddenToken(true)
export abstract class NoincludeToken extends NowikiBaseToken {
	override readonly type = 'noinclude';

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s[^>]*)?\/?>$/iu.test(this.innerText)) {
			this.constructorError('不可更改文字内容');
		}
		return super.setText(str);
	}
}

classes['NoincludeToken'] = __filename;
