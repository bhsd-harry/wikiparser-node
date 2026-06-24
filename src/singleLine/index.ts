import {Token} from '../index';
import type {MultiLineToken} from '../multiLine/index';

/**
 * single-line token inside specific extension tags, such as `<charinsert>` and `<imagemap>`
 *
 * 特定扩展标签内的单行节点，如 `<charinsert>` 和 `<imagemap>`
 */
export abstract class SingleLineToken extends Token {
	abstract override get parentNode(): MultiLineToken | undefined;

	/** @private */
	override isPlain(): boolean {
		return this.type === 'plain';
	}
}
