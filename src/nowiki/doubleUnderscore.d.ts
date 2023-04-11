import NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DoubleUnderscoreToken extends NowikiToken {
	override type: 'double-underscore';

	/** @override */
	override print(): string;

	/**
	 * @override
	 * @param {string} selector
	 */
	override toString(selector: string): string;

	/**
	 * @override
	 * @throws `Error` 禁止修改
	 */
	override setText(): never;
}

export = DoubleUnderscoreToken;
