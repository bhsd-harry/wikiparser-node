import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '../index';

/** 状态开关 */
export abstract class DoubleUnderscoreToken extends hiddenToken(NowikiBaseToken) {
	override readonly type = 'double-underscore';

	/**
	 * @param word 状态开关名
	 * @param sensitive 是否固定大小写
	 */
	constructor(word: string, sensitive: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 2 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return `__${this.innerText}__`;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}
}
