import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken()
export abstract class NoincludeToken extends NowikiBaseToken {
	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}

	/* NOT FOR BROWSER */

	override setText(str: string): string {
		if (/^<\/?(?:(?:no|only)include|includeonly)(?:\s[^>]*)?\/?>$/iu.test(this.innerText)) {
			this.constructorError('cannot change the text content');
		}
		return super.setText(str);
	}
}

classes['NoincludeToken'] = __filename;
