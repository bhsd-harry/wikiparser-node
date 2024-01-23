import {NowikiBaseToken} from './base';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) implements SolTokenBase {
	override readonly type = 'hr';
}
