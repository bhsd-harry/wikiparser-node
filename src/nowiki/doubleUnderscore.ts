import * as hidden from '../../mixin/hidden';
import * as Parser from '../../index';
import NowikiBaseToken = require('./base');
import Token = require('..');

/** 状态开关 */
abstract class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
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
	override print(): string {
		return super.print({pre: '__', post: '__'});
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return selector && this.matches(selector) ? '' : `__${this.firstChild.data}__`;
	}

	/** @param word 状态开关名 */
	constructor(word: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}

	/** @override */
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Parser.run(() => new DoubleUnderscoreToken(this.firstChild.data, this.getAttribute('config')));
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
export = DoubleUnderscoreToken;
