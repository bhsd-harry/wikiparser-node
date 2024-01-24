import {NowikiBaseToken} from './base';

/** `;:*#` */
export abstract class ListBaseToken extends syntax(NowikiBaseToken, /^[;:*#]+$/u) {
	declare type: 'dd' | 'list';
}
