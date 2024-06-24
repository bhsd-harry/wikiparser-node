import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';

/** `<hr>` */
@sol @syntax(/^-{4,}$/u)
export abstract class HrToken extends NowikiBaseToken {
	override get type(): 'hr' {
		return 'hr';
	}

	/** @private */
	override toHtml(): string {
		return '<hr>';
	}
}

classes['HrToken'] = __filename;
