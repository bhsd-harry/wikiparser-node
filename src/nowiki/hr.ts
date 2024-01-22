import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';
import type {SolTokenBase} from '../../mixin/sol';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) implements SolTokenBase {
	override readonly type = 'hr';
}

classes['HrToken'] = __filename;
