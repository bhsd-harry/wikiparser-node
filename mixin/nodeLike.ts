import {mixin} from '../util/debug';
import type {Dimension} from '../lib/node';
import type {AstNodes} from '../internal';

declare type NodeConstructor = abstract new (...args: any[]) => {
	readonly childNodes: readonly AstNodes[];
	getDimension(): Dimension;
};

export interface NodeLike {

	/** first child node / 首位子节点 */
	readonly firstChild: AstNodes | undefined;

	/** last child node / 末位子节点 */
	readonly lastChild: AstNodes | undefined;

	/** number of lines / 行数 */
	readonly offsetHeight: number;

	/** number of columns of the last line / 最后一行的列数 */
	readonly offsetWidth: number;
}

/** @ignore */
export const nodeLike = <S extends NodeConstructor>(constructor: S): S => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class NodeLike extends constructor implements NodeLike {
		get firstChild(): AstNodes | undefined {
			return this.childNodes[0];
		}

		get lastChild(): AstNodes | undefined {
			return this.childNodes[this.childNodes.length - 1];
		}

		get offsetHeight(): number {
			LINT: return this.getDimension().height; // eslint-disable-line no-unused-labels
		}

		get offsetWidth(): number {
			LINT: return this.getDimension().width; // eslint-disable-line no-unused-labels
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(NodeLike, constructor);
	return NodeLike;
};
