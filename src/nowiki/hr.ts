import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '..';

/** `<hr>` */
export abstract class HrToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'hr';

	/**
	 * @browser
	 * @param n 字符串长度
	 */
	constructor(n: number, config = Parser.getConfig(), accum: Token[] = []) {
		super('-'.repeat(n), config, accum);
	}
}
