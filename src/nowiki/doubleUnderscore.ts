import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../index';

/**
 * behavior switch
 *
 * 状态开关
 */
@hiddenToken()
export abstract class DoubleUnderscoreToken extends NowikiBaseToken {
	declare readonly name: string;

	override get type(): 'double-underscore' {
		return 'double-underscore';
	}

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 */
	constructor(word: string, sensitive: boolean, config: Config, accum?: Token[]) {
		super(word, config, accum);
		const lc = word.toLowerCase(),
			{doubleUnderscore: [,, iAlias, sAlias]} = config;
		this.setAttribute('name', (sensitive ? sAlias?.[word]?.toLowerCase() : iAlias?.[lc]) ?? lc);
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
