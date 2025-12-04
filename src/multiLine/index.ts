import {Token} from '../index';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * extension tag that is parsed line by line
 *
 * 逐行解析的扩展标签
 */
export abstract class MultiLineToken extends Token {
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}
}
