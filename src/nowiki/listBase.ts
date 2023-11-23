import {NowikiBaseToken} from './base';

/** `;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListBaseToken extends NowikiBaseToken {
	/** @browser */
	declare type: 'dd' | 'list';
}
