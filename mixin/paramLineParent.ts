import type {ParamLineToken} from '../src/paramLine';

/* NOT FOR BROWSER ONLY */

import {
	mixin,
} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

/**
 * 子节点为ParamLineToken的类
 * @ignore
 */
export const paramLineParent = <T extends AstConstructor>(constructor: T): T => {
	abstract class ParamLineParent extends constructor implements ParamLineParent {
		declare readonly childNodes: readonly ParamLineToken[];
	}

	/* NOT FOR BROWSER ONLY */

	mixin(ParamLineParent, constructor);

	/* NOT FOR BROWSER ONLY END */

	return ParamLineParent;
};
