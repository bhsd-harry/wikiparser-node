import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) {
	override readonly type = 'hr';
}
