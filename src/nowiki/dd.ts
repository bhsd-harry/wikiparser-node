import * as Parser from '../../index';
import NowikiBaseToken = require('./base');

/** `:` */
abstract class DdToken extends NowikiBaseToken {
	/** @browser */
	override readonly type: 'dd' | 'list' = 'dd';

	/** 是否包含`;` */
	get dt(): boolean {
		return this.firstChild.data.includes(';');
	}

	/** 是否包含`*` */
	get ul(): boolean {
		return this.firstChild.data.includes('*');
	}

	/** 是否包含`#` */
	get ol(): boolean {
		return this.firstChild.data.includes('#');
	}

	/** 缩进数 */
	get indent(): number {
		return this.firstChild.data.split(':').length - 1;
	}

	/** @throws `RangeError` indent不是自然数 */
	set indent(indent) {
		if (this.type === 'dd') {
			if (!Number.isInteger(indent)) {
				this.typeError('indent setter', 'Number');
			} else if (indent < 0) {
				throw new RangeError('indent 应为自然数！');
			}
			this.setText(':'.repeat(indent));
		}
	}

	/**
	 * @override
	 * @param str 新文本
	 * @throws `RangeError` 错误的列表语法
	 */
	override setText(str: string): string {
		const src = this.type === 'dd' ? ':' : ';:*#';
		if (new RegExp(`[^${src}]`, 'u').test(str)) {
			throw new RangeError(`${this.constructor.name} 仅能包含${[...src].map(c => `"${c}"`).join('、')}！`);
		}
		return super.setText(str);
	}
}

Parser.classes['DdToken'] = __filename;
export = DdToken;
