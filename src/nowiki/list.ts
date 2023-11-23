import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
export class ListToken extends ListBaseToken {
	/** @browser */
	override readonly type = 'list';
}
