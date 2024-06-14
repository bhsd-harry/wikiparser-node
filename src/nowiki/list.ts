import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
export abstract class ListToken extends ListBaseToken {
	override get type(): 'list' {
		return 'list';
	}
}
