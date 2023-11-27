import type {MagicLinkToken} from '../src/magicLink';

/**
 * ExtLinkToken
 * @param constructor 基类
 */
export const magicLinkParent = <T extends AstConstructor>(constructor: T) => {
	/** 子节点含有MagicLinkParent的类 */
	abstract class MagicLinkParent extends constructor {
		abstract get firstChild(): MagicLinkToken;
	}
	return MagicLinkParent;
};
