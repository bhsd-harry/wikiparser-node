import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {Token} from '..';

/** 状态开关 */
// @ts-expect-error not implementing all abstract methods
export class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'double-underscore';
	declare name: string;

	/** @param word 状态开关名 */
	constructor(word: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `__${this.firstChild.data}__`;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}

	/** @override */
	override cloneNode(): this {
		return Parser.run(() => new DoubleUnderscoreToken(this.firstChild.data, this.getAttribute('config')) as this);
	}

	/**
	 * @override
	 * @throws `Error` 禁止修改
	 */
	override setText(): never {
		throw new Error(`禁止修改 ${this.constructor.name}！`);
	}
}

Parser.classes['DoubleUnderscoreToken'] = __filename;
