import {ListBaseToken} from './listBase';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import type {SyntaxBase} from '../../mixin/syntax';

export interface ListToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * `;:*#` at the start of a line
 *
 * 位于行首的`;:*#`
 */
@sol(true) @syntax(/^[;:*#]+[^\S\n]*$/u)
export abstract class ListToken extends ListBaseToken {
	override get type(): 'list' {
		return 'list';
	}
}

classes['ListToken'] = __filename;
