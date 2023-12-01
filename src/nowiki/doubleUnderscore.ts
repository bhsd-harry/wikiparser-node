import {hidden} from '../../mixin/hidden';
import {syntax} from '../../mixin/syntax';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '../index';

/** 状态开关 */
// @ts-expect-error not implementing all abstract methods
export class DoubleUnderscoreToken extends syntax(hidden(NowikiBaseToken)) {
	override readonly type = 'double-underscore';
	declare name: string;

	/* NOT FOR BROWSER */

	#fixed;

	/* NOT FOR BROWSER END */

	/**
	 * @param word 状态开关名
	 * @param fixed 是否固定大小写
	 */
	constructor(word: string, fixed: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.#fixed = fixed;
		this.setAttribute('name', word.toLowerCase());
		this.setAttribute('pattern', new RegExp(`^${word}$`, fixed ? 'u' : 'iu'));
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 2 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `__${this.innerText}__`;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new DoubleUnderscoreToken(this.innerText, this.#fixed, config) as this;
			token.afterBuild();
			return token;
		});
	}
}

Parser.classes['DoubleUnderscoreToken'] = __filename;
