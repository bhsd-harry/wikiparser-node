import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../index';

/**
 * behavior switch
 *
 * 状态开关
 */
@hiddenToken() @padded('__')
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
	override toString(): string {
		return `__${this.innerText}__`;
	}
}
