import {ListBaseToken} from './listBase';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';

/* NOT FOR BROWSER END */

/** `:` */
@syntax(/^:+$/u)
export abstract class DdToken extends ListBaseToken {
	override get type(): 'dd' {
		return 'dd';
	}
}

classes['DdToken'] = __filename;
