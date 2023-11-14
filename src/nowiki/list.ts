import {DdToken} from './dd';

/** 位于行首的`;:*#` */
export abstract class ListToken extends DdToken {
	/** @browser */
	override readonly type = 'list';
}
