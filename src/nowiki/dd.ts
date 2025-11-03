import {ListBaseToken} from './listBase';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import type {SyntaxBase} from '../../mixin/syntax';

export interface DdToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/** `:` */
@syntax(/^:+$/u)
export abstract class DdToken extends ListBaseToken {
	override get type(): 'dd' {
		return 'dd';
	}
}

classes['DdToken'] = __filename;
