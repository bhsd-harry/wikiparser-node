import {sol} from '../../mixin/sol';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';

/** `<hr>` */
// @ts-expect-error not implementing all abstract methods
export class HrToken extends sol(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'hr';

	/** @override */
	override cloneNode(): this {
		return Parser.run(() => new HrToken(this.firstChild.data, this.getAttribute('config')) as this);
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
