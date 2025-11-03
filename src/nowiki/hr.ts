import {NowikiBaseToken} from './base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import type {SyntaxBase} from '../../mixin/syntax';

export interface HrToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/** `<hr>` */
@sol() @syntax(/^-{4,}$/u)
export abstract class HrToken extends NowikiBaseToken {
	override get type(): 'hr' {
		return 'hr';
	}

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlInternal(): string {
		return '<hr>';
	}
}

classes['HrToken'] = __filename;
