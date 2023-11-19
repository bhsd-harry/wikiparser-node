import {NowikiBaseToken} from './base';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'hr';
}
