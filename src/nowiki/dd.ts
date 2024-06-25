import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import {ListBaseToken} from './listBase';

/** `:` */
@syntax(/^:+[^\S\n]*$/u)
export abstract class DdToken extends ListBaseToken {
	override get type(): 'dd' {
		return 'dd';
	}

	/* NOT FOR BROWSER */

	/** 缩进数 */
	get indent(): number {
		return this.innerText.trimEnd().length;
	}

	set indent(indent) {
		this.setText(':'.repeat(indent));
	}
}

classes['DdToken'] = __filename;
