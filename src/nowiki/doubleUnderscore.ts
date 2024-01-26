import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import {syntax} from '../../mixin/syntax';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '../index';

/** 状态开关 */
export abstract class DoubleUnderscoreToken extends syntax(hiddenToken(NowikiBaseToken)) {
	override readonly type = 'double-underscore';

	/* NOT FOR BROWSER */

	declare readonly name: string;
	readonly #sensitive;

	/* NOT FOR BROWSER END */

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 */
	constructor(word: string, sensitive: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.#sensitive = sensitive;
		this.setAttribute('name', word.toLowerCase());
		this.setAttribute('pattern', new RegExp(`^${word}$`, sensitive ? 'u' : 'iu'));
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
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new DoubleUnderscoreToken(this.innerText, this.#sensitive, config) as this;
			token.afterBuild();
			return token;
		});
	}
}

classes['DoubleUnderscoreToken'] = __filename;
