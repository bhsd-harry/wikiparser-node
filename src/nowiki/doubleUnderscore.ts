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

	/**
	 * @param word 状态开关名
	 * @param fixed 是否固定大小写
	 */
	constructor(word: string, fixed: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.#fixed = fixed;
		this.setAttribute('name', word.toLowerCase())
			.setAttribute('pattern', new RegExp(`^${word}$`, fixed ? 'u' : 'iu'));
	}

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/** @override */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `__${this.firstChild.data}__`;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}
}

Parser.classes['DoubleUnderscoreToken'] = __filename;
