import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends ListBaseToken {
	/** @browser */
	override readonly type = 'list';
}
