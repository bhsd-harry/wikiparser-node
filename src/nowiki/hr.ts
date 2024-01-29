import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';

/** `<hr>` */
@sol
export abstract class HrToken extends syntax(NowikiBaseToken, /^-{4,}$/u) {
	override readonly type = 'hr';
}

classes['HrToken'] = __filename;
