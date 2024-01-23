import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
// @ts-expect-error not implementing all abstract methods
export class NoincludeToken extends hiddenToken(NowikiBaseToken) {
	override readonly type = 'noinclude';
}
