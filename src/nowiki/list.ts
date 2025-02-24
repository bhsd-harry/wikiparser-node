import {ListBaseToken} from './listBase';

/**
 * `;:*#` at the start of a line
 *
 * 位于行首的`;:*#`
 */
export abstract class ListToken extends ListBaseToken {
	override get type(): 'list' {
		return 'list';
	}
}
