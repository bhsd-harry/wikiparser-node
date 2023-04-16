import NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DoubleUnderscoreToken extends NowikiToken {
	override type: 'double-underscore';

	/** @override */
	override print(): string;

	/** @override */
	override toString(selector: string): string;
}

export = DoubleUnderscoreToken;
