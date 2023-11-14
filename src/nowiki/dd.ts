import {NowikiBaseToken} from './base';

/** `:` */
export abstract class DdToken extends NowikiBaseToken {
	/** @browser */
	override readonly type: 'dd' | 'list' = 'dd';
}
