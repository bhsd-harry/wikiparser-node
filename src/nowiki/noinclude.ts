import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** `<noinclude>`和`</noinclude>`，不可进行任何更改 */
@hiddenToken()
export abstract class NoincludeToken extends NowikiBaseToken {
	override get type(): 'noinclude' {
		return 'noinclude';
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
