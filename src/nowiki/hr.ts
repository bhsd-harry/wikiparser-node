import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends NowikiBaseToken {
	override get type(): 'hr' {
		return 'hr';
	}

	/** @private */
	override toHtml(): string {
		return '<hr>';
	}
}
