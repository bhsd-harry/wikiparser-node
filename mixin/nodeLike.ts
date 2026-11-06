import type {AstNodes} from '../internal';

/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

declare type NodeConstructor = abstract new (...args: any[]) => {
	readonly childNodes: readonly AstNodes[];
};

export interface NodeLike {

	/** first child node / 首位子节点 */
	readonly firstChild: AstNodes | undefined;

	/** last child node / 末位子节点 */
	readonly lastChild: AstNodes | undefined;
}

/** @ignore */
export const nodeLike = <S extends NodeConstructor>(constructor: S): S => {
	abstract class NodeLike extends constructor implements NodeLike {
		get firstChild(): AstNodes | undefined {
			return this.childNodes[0];
		}

		get lastChild(): AstNodes | undefined {
			return this.childNodes[this.childNodes.length - 1];
		}
	}

	/* NOT FOR BROWSER ONLY */

	mixin(NodeLike, constructor);

	/* NOT FOR BROWSER ONLY END */

	return NodeLike;
};
