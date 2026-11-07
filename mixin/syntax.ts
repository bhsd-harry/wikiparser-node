export interface SyntaxBase {
	/** @private */
	pattern: RegExp;
}

/**
 * 满足特定语法格式的Token
 * @param pattern 语法正则
 */
export const syntax = (pattern?: RegExp) => <S extends AstConstructor>(constructor: S): S => {
	abstract class SyntaxToken extends constructor implements SyntaxBase {
		declare pattern: RegExp;
	}
	return SyntaxToken;
};
