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

	/* NOT FOR BROWSER */

	/** number of indentation / 缩进数 */
	get indent(): number {
		return this.innerText.length;
	}

	set indent(indent) {
		this.setText(':'.repeat(indent));
	}
}

classes['DdToken'] = __filename;
