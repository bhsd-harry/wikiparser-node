import {DdToken} from './dd';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends DdToken {
	/** @browser */
	override readonly type = 'list';
}
