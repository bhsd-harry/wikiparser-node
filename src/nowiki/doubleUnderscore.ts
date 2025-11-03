import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import type {SyntaxBase} from '../../mixin/syntax';

export interface DoubleUnderscoreToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * behavior switch
 *
 * 状态开关
 */
@syntax()
@hiddenToken() @padded('__')
export abstract class DoubleUnderscoreToken extends NowikiBaseToken {
	declare readonly name: string;
	readonly #fullWidth;

	/* NOT FOR BROWSER */

	readonly #sensitive;

	/* NOT FOR BROWSER END */

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

		/* NOT FOR BROWSER */

		this.#sensitive = sensitive;
		this.setAttribute('pattern', new RegExp(`^${word}$`, sensitive ? 'u' : 'iu'));
	}

	/** @private */
	override toString(): string {
		const underscore = this.#fullWidth ? '＿＿' : '__';
		return underscore + this.innerText + underscore;
	}

	/** @private */
	override print(): string {
		const underscore = this.#fullWidth ? '＿＿' : '__';
		return super.print({pre: underscore, post: underscore});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Shadow.run((): this => new DoubleUnderscoreToken(
			this.innerText,
			this.#sensitive,
			this.#fullWidth,
			this.getAttribute('config'),
		));
	}
}

classes['DoubleUnderscoreToken'] = __filename;
