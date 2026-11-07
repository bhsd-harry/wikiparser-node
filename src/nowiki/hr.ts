import {NowikiBaseToken} from './base';

/** `<hr>` */
export abstract class HrToken extends NowikiBaseToken {
	override get type(): 'hr' {
		return 'hr';
	}

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlInternal(): string {
		return '<hr>';
	}
}
