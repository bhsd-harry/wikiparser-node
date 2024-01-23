import {NowikiBaseToken} from './base';
import type {SolTokenBase} from '../../mixin/sol';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends NowikiBaseToken {
	override readonly type = 'hr';
}
