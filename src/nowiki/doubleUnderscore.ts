import {hidden} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/** 状态开关 */
export abstract class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'double-underscore';

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return `__${this.firstChild.data}__`;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}
}
