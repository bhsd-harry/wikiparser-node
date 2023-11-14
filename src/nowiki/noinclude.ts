import {hidden} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
export abstract class NoincludeToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'noinclude';
}
