import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';
import type {SolTokenBase} from '../../mixin/sol';

/* NOT FOR BROWSER */

export interface HrToken extends SolTokenBase {}

/* NOT FOR BROWSER END */

/** `<hr>` */
export abstract class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) {
	override readonly type = 'hr';
}

classes['HrToken'] = __filename;
