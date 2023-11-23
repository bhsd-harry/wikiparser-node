import * as Parser from '../../index';
import {ListBaseToken} from './listBase';

/** `:` */
// @ts-expect-error not implementing all abstract methods
export class DdToken extends ListBaseToken {
	override readonly type = 'dd';

	/* NOT FOR BROWSER */

	/** @private */
	override afterBuild(): void {
		this.setAttribute('pattern', /^:+$/u);
		super.afterBuild();
	}
}

Parser.classes['DdToken'] = __filename;
