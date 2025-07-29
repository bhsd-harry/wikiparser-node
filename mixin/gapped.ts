/**
 * 给定 gap 的类
 * @param gap
 */
export const gapped = (gap = 1) => <S extends AstConstructor>(constructor: S): S => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class GappedToken extends constructor {
		getGaps(): number {
			return gap;
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	return GappedToken;
};
