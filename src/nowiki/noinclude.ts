import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
export abstract class NoincludeToken extends hiddenToken(NowikiBaseToken) {
	override readonly type = 'noinclude';
}
