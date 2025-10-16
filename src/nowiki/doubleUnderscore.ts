import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/**
 * behavior switch
 *
 * 状态开关
 */
@hiddenToken() @padded('__')
export abstract class DoubleUnderscoreToken extends NowikiBaseToken {
	declare readonly name: string;
	readonly #fullWidth;

	override get type(): 'double-underscore' {
		return 'double-underscore';
	}

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 * @param fullWidth 是否为全角下划线
	 */
	constructor(word: string, sensitive: boolean, fullWidth: boolean, config: Config, accum?: Token[]) {
		super(word, config, accum);
		const lc = word.toLowerCase(),
			{doubleUnderscore: [,, iAlias, sAlias]} = config;
		this.setAttribute('name', (sensitive ? sAlias?.[word]?.toLowerCase() : iAlias?.[lc]) ?? lc);
		this.#fullWidth = fullWidth;
	}

	/** @private */
	override toString(): string {
		const underscore = this.#fullWidth ? '＿＿' : '__';
		return underscore + this.innerText + underscore;
	}
}
