import {classes} from '../../util/constants';
import {ListBaseToken} from './listBase';

/** `:` */
export abstract class DdToken extends ListBaseToken {
	override get type(): 'dd' {
		return 'dd';
	}

	/* NOT FOR BROWSER */

	/** 缩进数 */
	get indent(): number {
		return this.innerText.length;
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

classes['DdToken'] = __filename;
