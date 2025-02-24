import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '../index';

/**
 * behavior switch
 *
 * 状态开关
 */
@hiddenToken()
export abstract class DoubleUnderscoreToken extends NowikiBaseToken {
	override get type(): 'double-underscore' {
		return 'double-underscore';
	}

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 */
	constructor(word: string, sensitive: boolean, config = Parser.getConfig(), accum?: Token[]) {
		super(word, config, accum);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 2 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override toString(): string {
		return `__${this.innerText}__`;
	}
}
