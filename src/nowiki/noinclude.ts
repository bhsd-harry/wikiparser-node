import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken(false)
export abstract class NoincludeToken extends NowikiBaseToken {
	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}
}
