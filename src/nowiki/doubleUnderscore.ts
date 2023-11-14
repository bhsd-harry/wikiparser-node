import {hidden} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '..';

/** 状态开关 */
export abstract class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'double-underscore';
	declare name: string;

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return `__${this.firstChild.data}__`;
	}

	/** @param word 状态开关名 */
	constructor(word: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}
}
