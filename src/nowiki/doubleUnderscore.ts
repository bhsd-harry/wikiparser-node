import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '../index';

/** 状态开关 */
// @ts-expect-error not implementing all abstract methods
export class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	override readonly type = 'double-underscore';

	/**
	 * @param word 状态开关名
	 * @param fixed 是否固定大小写
	 */
	constructor(word: string, fixed: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
	}

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return `__${this.firstChild.data}__`;
	}
}
