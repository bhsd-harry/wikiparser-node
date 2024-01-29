import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends syntax(NowikiBaseToken, /^-{4,}$/u) {
	override readonly type = 'hr';
}
