import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../index';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';

/* NOT FOR BROWSER END */

/**
 * behavior switch
 *
 * 状态开关
 */
@syntax()
@hiddenToken()
export abstract class DoubleUnderscoreToken extends NowikiBaseToken {
	/* NOT FOR BROWSER */

	declare readonly name: string;
	readonly #sensitive;

	/* NOT FOR BROWSER END */

	override get type(): 'double-underscore' {
		return 'double-underscore';
	}

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 */
	constructor(word: string, sensitive: boolean, config: Config, accum?: Token[]) {
		super(word, config, accum);

		/* NOT FOR BROWSER */

		const lc = word.toLowerCase();
		this.#sensitive = sensitive;
		this.setAttribute('name', sensitive ? lc : config.doubleUnderscore[2]?.[lc] ?? lc);
		this.setAttribute('pattern', new RegExp(`^${word}$`, sensitive ? 'u' : 'iu'));
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 2 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override toString(): string {
		return `__${this.innerText}__`;
	}

	/** @private */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run(() => new DoubleUnderscoreToken(this.innerText, this.#sensitive, config));
	}
}

classes['DoubleUnderscoreToken'] = __filename;
