import {NowikiBaseToken} from './base';

/** `:` */
// @ts-expect-error not implementing all abstract methods
export class DdToken extends NowikiBaseToken {
	/** @browser */
	override readonly type: 'dd' | 'list' = 'dd';
}
