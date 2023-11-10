import {hidden} from '../../mixin/hidden';
import {Parser} from '../../index';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
export abstract class NoincludeToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'noinclude';

	/**
	 * @override
	 * @param str 新文本
	 * @throws `Error` 不可更改
	 */
	override setText(str: string): string {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s.*)?\/?>$/isu.test(this.firstChild.data)) {
			throw new Error(`${this.constructor.name} 不可更改文字内容！`);
		}
		return super.setText(str);
	}
}

Parser.classes['NoincludeToken'] = __filename;
