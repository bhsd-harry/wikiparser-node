'use strict';
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** `:` */
class DdToken extends NowikiBaseToken {
	/** @browser */
	type = 'dd';

	/** 是否包含`;` */
	get dt() {
		return this.firstChild.data.includes(';');
	}

	/** 是否包含`*` */
	get ul() {
		return this.firstChild.data.includes('*');
	}

	/** 是否包含`#` */
	get ol() {
		return this.firstChild.data.includes('#');
	}

	/** 缩进数 */
	get indent() {
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
	setText(str) {
		const src = this.type === 'dd' ? ':' : ';:*#';
		if (new RegExp(`[^${src}]`, 'u').test(str)) {
			throw new RangeError(`${this.constructor.name} 仅能包含${[...src].map(c => `"${c}"`).join('、')}！`);
		}
		return super.setText(str);
	}
}
Parser.classes.DdToken = __filename;
module.exports = DdToken;
