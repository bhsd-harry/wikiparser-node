/**
 * 不需要转义的类
 * @ignore
 */
export const noEscape = <T extends AstConstructor>(constructor: T): T => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class NoEscapeToken extends constructor {
		escape(): void { // eslint-disable-line @typescript-eslint/class-methods-use-this
			//
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	return NoEscapeToken;
};
