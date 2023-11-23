import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
// @ts-expect-error not implementing all abstract methods
export class NoincludeToken extends hidden(NowikiBaseToken) {
	override readonly type = 'noinclude';
}

Parser.classes['NoincludeToken'] = __filename;
