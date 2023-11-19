import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'hr';
}
