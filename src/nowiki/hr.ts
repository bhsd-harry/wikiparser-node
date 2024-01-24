import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) implements SolTokenBase {
	override readonly type = 'hr';
}
