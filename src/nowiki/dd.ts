import {Shadow} from '../../util/debug';
import {ListBaseToken} from './listBase';

/** `:` */
// @ts-expect-error not implementing all abstract methods
export class DdToken extends ListBaseToken {
	override readonly type = 'dd';

	/* NOT FOR BROWSER */

	/** 缩进数 */
	get indent(): number {
		return this.innerText.split(':').length - 1;
	}

	set indent(indent) {
		this.setText(':'.repeat(indent));
	}

	/** @private */
	override afterBuild(): void {
		this.setAttribute('pattern', /^:+$/u);
		super.afterBuild();
	}
}

Shadow.classes['DdToken'] = __filename;
