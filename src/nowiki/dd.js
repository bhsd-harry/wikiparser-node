'use strict';

const Parser = require('../..'),
	NowikiBaseToken = require('./base');

/**
 * :
 * @classdesc `{childNodes: [AstText]}`
 */
class DdToken extends NowikiBaseToken {
	/** @type {'dd'} */ type = 'dd';

	/** 是否包含<dt> */
	get dt() {
		return String(this).includes(';');
	}

	/** 是否包含<ul> */
	get ul() {
		return String(this).includes('*');
	}

	/** 是否包含<ol> */
	get ol() {
		return String(this).includes('#');
	}

	/** 缩进数 */
	get indent() {
		return String(this).split(':').length - 1;
	}

	set indent(indent) {
		if (this.type === 'dd') {
			if (!Number.isInteger(indent)) {
				this.typeError('set indent', 'Number');
			} else if (indent < 0) {
				throw new RangeError(`indent 应为自然数！${indent}`);
			}
			this.setText(':'.repeat(indent));
		}
	}

	/**
	 * @override
	 * @param {string} str 新文本
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
