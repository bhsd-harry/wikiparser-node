import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends NowikiBaseToken {
	override readonly type = 'hr';
}
