import {sol} from '../../mixin/sol';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '..';

/** `<hr>` */
export abstract class HrToken extends sol(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'hr';

	/**
	 * @browser
	 * @param n 字符串长度
	 */
	constructor(n: number, config = Parser.getConfig(), accum: Token[] = []) {
		super('-'.repeat(n), config, accum);
	}

	/** @override */
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Parser.run(() => new HrToken(this.firstChild.data.length, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param str 新文本
	 * @throws `RangeError` 错误的`<hr>`语法
	 */
	override setText(str: string): string {
		if (str.length < 4 || /[^-]/u.test(str)) {
			throw new RangeError('<hr>总是写作不少于4个的连续"-"！');
		}
		return super.setText(str);
	}
}

Parser.classes['HrToken'] = __filename;
