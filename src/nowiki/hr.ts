import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends syntax(sol(NowikiBaseToken), /^-{4,}$/u) {
	/** @browser */
	override readonly type = 'hr';
}

Parser.classes['HrToken'] = __filename;
